import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/admin", () => ({ isAdminEmail: () => true }));
vi.mock("@/db", async () => ({
  ...(await import("@/db/schema")),
  db: {
    execute: mocks.execute,
  },
}));

import { DELETE } from "./route";

function context(groupId = "4", memberId = "10") {
  return { params: Promise.resolve({ id: groupId, memberId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { email: "admin@gmail.com" } });
});

describe("DELETE /api/admin/guests/:id/members/:memberId", () => {
  it("removes an individual connected account", async () => {
    mocks.execute.mockResolvedValue({ rows: [{ id: 10 }] });

    const response = await DELETE(new Request("http://localhost"), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.execute).toHaveBeenCalledOnce();
    const query = mocks.execute.mock.calls[0][0] as SQL;
    const rendered = new PgDialect().sqlToQuery(query).sql;
    expect(rendered).toContain('delete from "group_members"');
    expect(rendered).toContain('update "groups"');
    expect(rendered).toContain("order by");
    expect(rendered).not.toContain("rsvps");
  });

  it("returns not found without changing anything when the account is absent", async () => {
    mocks.execute.mockResolvedValue({ rows: [] });

    const response = await DELETE(new Request("http://localhost"), context());

    expect(response.status).toBe(404);
  });

  it("rejects invalid identifiers before executing SQL", async () => {
    const response = await DELETE(new Request("http://localhost"), context("bad"));

    expect(response.status).toBe(400);
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
