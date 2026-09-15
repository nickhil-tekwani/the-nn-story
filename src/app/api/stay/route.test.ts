import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getStayEligibility: vi.fn(), getStayData: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/stay", () => ({ getStayEligibility: mocks.getStayEligibility, getStayData: mocks.getStayData }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { email: "guest@example.com" } });
  mocks.getStayEligibility.mockResolvedValue({ groupId: 42, groupLabel: "Nick Friends", partySize: 1, partyMembers: ["Guest Person"] });
  mocks.getStayData.mockResolvedValue({ partySize: 1, lodging: null, legs: [], hotels: [], hotelMatches: [] });
});

describe("GET /api/stay", () => {
  it("rejects signed-out requests", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(mocks.getStayEligibility).not.toHaveBeenCalled();
  });

  it("rejects signed-in accounts outside an eligible RSVP group", async () => {
    mocks.getStayEligibility.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(403);
    expect(mocks.getStayData).not.toHaveBeenCalled();
  });

  it("returns only the authenticated eligible group's plan", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.getStayEligibility).toHaveBeenCalledWith("guest@example.com");
    expect((await response.json()).partySize).toBe(1);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
