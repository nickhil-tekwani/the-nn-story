import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  execute: vi.fn(),
  logEvent: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/logEvent", () => ({ logEvent: mocks.logEvent }));
vi.mock("@/db", async () => ({
  ...(await import("@/db/schema")),
  db: {
    execute: mocks.execute,
    select: mocks.select,
    update: mocks.update,
  },
}));

import { POST } from "./route";

function request(phone = "+15135550123") {
  return new Request("http://localhost/api/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
}

function queueSelects(...results: unknown[][]) {
  const queue = [...results];
  mocks.select.mockImplementation(() => {
    const result = queue.shift();
    if (!result) throw new Error("Unexpected select");
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.innerJoin = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.limit = vi.fn(async () => result);
    return chain;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { email: "Guest@Gmail.com" } });
  mocks.update.mockImplementation(() => {
    const chain: Record<string, unknown> = {};
    chain.set = vi.fn(() => chain);
    chain.where = vi.fn(async () => undefined);
    return chain;
  });
});

describe("POST /api/claim", () => {
  it("requires Google authentication", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("treats an existing email membership as idempotent", async () => {
    const joinedAt = new Date("2026-08-01T12:00:00Z");
    queueSelects([{ groupId: 4, phone: "+15135550123", slot: 1, joinedAt }]);
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, joinedExistingGroup: false });
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("creates the first membership and initializes compatibility metadata", async () => {
    queueSelects([], [{ groupId: 4, maxPartySize: 3, hasPrimaryClaim: false }]);
    mocks.execute.mockResolvedValue({ rows: [{ id: 10, slot: 1 }] });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, joinedExistingGroup: false });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.logEvent).toHaveBeenCalledWith("invite_claimed", {
      email: "guest@gmail.com",
      groupId: 4,
      properties: { joinedExistingGroup: false },
    });
  });

  it("connects a secondary account and requests the one-time notice", async () => {
    queueSelects([], [{ groupId: 4, maxPartySize: 3, hasPrimaryClaim: true }]);
    mocks.execute.mockResolvedValue({ rows: [{ id: 11, slot: 2 }] });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, joinedExistingGroup: true });
    expect(mocks.update).not.toHaveBeenCalled();
    const query = mocks.execute.mock.calls[0][0] as SQL;
    const rendered = new PgDialect().sqlToQuery(query).sql;
    expect(rendered).toContain("generate_series");
    expect(rendered).toContain('insert into "group_members"');
    expect(rendered).toContain("on conflict do nothing");
  });

  it("rejects an account that concurrently became connected to another group", async () => {
    queueSelects(
      [],
      [{ groupId: 4, maxPartySize: 3, hasPrimaryClaim: true }],
      [{ groupId: 9 }],
    );
    mocks.execute.mockResolvedValue({ rows: [] });

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/another invitation/i);
  });

  it("rejects a new account when all group membership slots are occupied", async () => {
    queueSelects(
      [],
      [{ groupId: 4, maxPartySize: 2, hasPrimaryClaim: true }],
      [],
      [],
      [],
    );
    mocks.execute.mockResolvedValue({ rows: [] });

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/all Google account spots/i);
    expect(mocks.execute).toHaveBeenCalledTimes(3);
  });
});
