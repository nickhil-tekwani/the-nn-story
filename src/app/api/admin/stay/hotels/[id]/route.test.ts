import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminEmail: vi.fn(),
  selectLimit: vi.fn(),
  batch: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({ eq: vi.fn((field, value) => ({ field, value })) }));
vi.mock("@/lib/requireAdmin", () => ({ requireAdminEmail: mocks.requireAdminEmail }));
vi.mock("@/lib/logEvent", () => ({ logEvent: mocks.logEvent }));
vi.mock("@/db", () => ({
  hotels: { table: "hotels", id: "hotels.id" },
  groupLodgingPlans: { table: "group_lodging_plans", hotelId: "group_lodging_plans.hotel_id" },
  events: { table: "events" },
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: mocks.selectLimit })) })) })),
    update: mocks.update,
    insert: mocks.insert,
    batch: mocks.batch,
  },
}));

import { PATCH } from "./route";

function mergeRequest() {
  return new Request("http://localhost/api/admin/stay/hotels/4", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "merge", mergeIntoId: 7 }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminEmail.mockResolvedValue("admin@example.com");
  mocks.selectLimit.mockResolvedValue([{ id: 7 }]);
  mocks.batch.mockResolvedValue([]);
  mocks.update.mockImplementation((table) => ({
    set: vi.fn((values) => ({
      where: vi.fn((condition) => ({ kind: "update", table, values, condition })),
    })),
  }));
  mocks.insert.mockImplementation((table) => ({
    values: vi.fn((values) => ({ kind: "insert", table, values })),
  }));
});

describe("PATCH /api/admin/stay/hotels/[id]", () => {
  it("batches reassignment, archival, and the audit event into one transaction", async () => {
    const response = await PATCH(mergeRequest(), { params: Promise.resolve({ id: "4" }) });

    expect(response.status).toBe(200);
    expect(mocks.batch).toHaveBeenCalledTimes(1);
    const operations = mocks.batch.mock.calls[0][0];
    expect(operations).toHaveLength(3);
    expect(operations[0]).toMatchObject({ kind: "update", table: expect.objectContaining({ table: "group_lodging_plans" }), values: { hotelId: 7 } });
    expect(operations[1]).toMatchObject({ kind: "update", table: expect.objectContaining({ table: "hotels" }), values: { isArchived: true } });
    expect(operations[2]).toMatchObject({
      kind: "insert",
      table: expect.objectContaining({ table: "events" }),
      values: expect.objectContaining({ event: "hotel_catalog_entry_merged", email: "admin@example.com" }),
    });
    expect(operations[0].values.updatedAt).toBe(operations[1].values.updatedAt);
    expect(mocks.logEvent).not.toHaveBeenCalled();
  });

  it("does not report success if the transaction fails", async () => {
    mocks.batch.mockRejectedValue(new Error("transaction failed"));

    await expect(PATCH(mergeRequest(), { params: Promise.resolve({ id: "4" }) })).rejects.toThrow("transaction failed");
    expect(mocks.logEvent).not.toHaveBeenCalled();
  });
});
