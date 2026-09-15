import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdminEmail: vi.fn(), getAdminStayRows: vi.fn() }));
vi.mock("@/lib/requireAdmin", () => ({ requireAdminEmail: mocks.requireAdminEmail }));
vi.mock("@/lib/stay", () => ({ getAdminStayRows: mocks.getAdminStayRows }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdminEmail.mockResolvedValue("admin@example.com");
  mocks.getAdminStayRows.mockResolvedValue({ rows: [], hotels: [] });
});

describe("GET /api/admin/stay", () => {
  it("rejects non-admin requests before reading travel data", async () => {
    mocks.requireAdminEmail.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(403);
    expect(mocks.getAdminStayRows).not.toHaveBeenCalled();
  });

  it("returns private, non-cacheable data to admins", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
