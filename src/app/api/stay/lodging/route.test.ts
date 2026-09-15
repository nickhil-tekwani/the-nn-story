import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getStayEligibility: vi.fn(), validate: vi.fn(), save: vi.fn(), getStayData: vi.fn(), logEvent: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/stay", () => ({ getStayEligibility: mocks.getStayEligibility, validateLodgingInput: mocks.validate, saveLodging: mocks.save, getStayData: mocks.getStayData }));
vi.mock("@/lib/logEvent", () => ({ logEvent: mocks.logEvent }));

import { PATCH } from "./route";

function request() { return new Request("http://localhost/api/stay/lodging", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lodgingType: "hotel", hotelId: 7 }) }); }

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { email: "GUEST@example.com" } });
  mocks.getStayEligibility.mockResolvedValue({ groupId: 42, groupLabel: "Nick Friends", partySize: 1, partyMembers: ["Guest Person"] });
  mocks.validate.mockReturnValue({ ok: true, value: { lodgingType: "hotel", hotelId: 7, localArea: null, revision: null } });
  mocks.save.mockResolvedValue({ ok: true, revision: 1, action: "first_response" });
  mocks.getStayData.mockResolvedValue({ partySize: 1, lodging: {}, legs: [], hotels: [], hotelMatches: [] });
});

describe("PATCH /api/stay/lodging", () => {
  it("never saves for an ineligible account", async () => {
    mocks.getStayEligibility.mockResolvedValue(null);
    const response = await PATCH(request());
    expect(response.status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.logEvent).not.toHaveBeenCalled();
  });

  it("saves and logs against the authenticated group rather than a client-supplied group", async () => {
    const response = await PATCH(request());
    expect(response.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith(42, expect.objectContaining({ hotelId: 7 }));
    expect(mocks.logEvent).toHaveBeenCalledWith("lodging_plan_saved", expect.objectContaining({ email: "guest@example.com", groupId: 42 }));
  });
});
