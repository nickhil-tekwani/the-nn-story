import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminEmail: vi.fn(),
  loadAnalyticsRows: vi.fn(),
}));

vi.mock("@/lib/requireAdmin", () => ({ requireAdminEmail: mocks.requireAdminEmail }));
vi.mock("@/lib/analytics/data", () => ({ loadAnalyticsRows: mocks.loadAnalyticsRows }));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/admin/analytics/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminEmail.mockResolvedValue("admin@example.com");
  mocks.loadAnalyticsRows.mockResolvedValue([{ invited_groups: 1, invited_individuals: 2 }]);
});

describe("POST /api/admin/analytics/query", () => {
  it("rejects non-admin users before loading analytics data", async () => {
    mocks.requireAdminEmail.mockResolvedValue(null);
    const response = await POST(request({}));
    expect(response.status).toBe(403);
    expect(mocks.loadAnalyticsRows).not.toHaveBeenCalled();
  });

  it("runs an allowlisted semantic query", async () => {
    const response = await POST(request({
      version: 1,
      dataset: "current_rsvps",
      measures: ["invited_groups", "invited_individuals"],
      dimensions: [],
      filters: [],
    }));
    expect(response.status).toBe(200);
    expect((await response.json()).rows[0]).toMatchObject({ invited_groups: 1, invited_individuals: 2 });
  });

  it("rejects raw or privacy-sensitive fields", async () => {
    const response = await POST(request({
      version: 1,
      dataset: "current_rsvps",
      measures: ["invited_groups"],
      dimensions: ["email"],
      filters: [],
    }));
    expect(response.status).toBe(400);
    expect(mocks.loadAnalyticsRows).not.toHaveBeenCalled();
  });
});
