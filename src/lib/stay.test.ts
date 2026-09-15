import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgres://test:test@localhost/test";
});
import {
  cincinnatiLocalToUtc,
  guestDisplayName,
  isStayEligibleRsvp,
  normalizeHotelKey,
  toCincinnatiInput,
  validateLodgingInput,
  validateTravelLegInput,
} from "./stay";

describe("stay planning rules", () => {
  it("limits access to the approved labels and affirmative out-of-town RSVPs", () => {
    expect(isStayEligibleRsvp("Nick Friends", { attending: true, needsHotel: true })).toBe(true);
    expect(isStayEligibleRsvp("Nikki Friends", { attending: true, needsHotel: true })).toBe(true);
    expect(isStayEligibleRsvp("Nick Fam", { attending: true, needsHotel: true })).toBe(true);
    expect(isStayEligibleRsvp("Core", { attending: true, needsHotel: true })).toBe(false);
    expect(isStayEligibleRsvp("Nikki Fam Friends", { attending: true, needsHotel: true })).toBe(false);
    expect(isStayEligibleRsvp("Nick Friends", { attending: false, needsHotel: true })).toBe(false);
    expect(isStayEligibleRsvp("Nick Friends", { attending: true, needsHotel: false })).toBe(false);
  });

  it("formats matching guests as first name plus last initial", () => {
    expect(guestDisplayName("Maya Patel")).toBe("Maya P.");
    expect(guestDisplayName("Arjun Ravi Shah")).toBe("Arjun S.");
    expect(guestDisplayName("Cher")).toBe("Cher");
  });

  it("deduplicates hotel keys independent of punctuation and case", () => {
    expect(normalizeHotelKey("Homewood Suites—Downtown", "Cincinnati", "OH"))
      .toBe(normalizeHotelKey("homewood suites downtown", "CINCINNATI", "oh"));
  });

  it("requires the correct lodging details", () => {
    expect(validateLodgingInput({ lodgingType: "hotel", hotelId: 3, revision: null }).ok).toBe(true);
    expect(validateLodgingInput({ lodgingType: "hotel" }).ok).toBe(false);
    expect(validateLodgingInput({ lodgingType: "friend_or_family", localArea: "Oakley" }).ok).toBe(true);
    expect(validateLodgingInput({ lodgingType: "friend_or_family", localArea: "" }).ok).toBe(false);
    expect(validateLodgingInput({ lodgingType: "undecided" }).ok).toBe(true);
  });

  it("validates flight airline and digits-only flight numbers", () => {
    expect(validateTravelLegInput("arrival", { mode: "flight", localDateTime: "2026-09-18T14:30", airlineCode: "UA", flightNumber: "1487" }).ok).toBe(true);
    expect(validateTravelLegInput("arrival", { mode: "flight", localDateTime: "2026-09-18T14:30", airlineCode: "UA", flightNumber: "UA1487" }).ok).toBe(false);
    expect(validateTravelLegInput("arrival", { mode: "flight", localDateTime: "2026-09-18T14:30", flightNumber: "1487" }).ok).toBe(false);
  });

  it("supports different rules for driving and bus legs", () => {
    expect(validateTravelLegInput("arrival", { mode: "drive", travelDate: "2026-09-18", timePeriod: "evening" }).ok).toBe(true);
    expect(validateTravelLegInput("arrival", { mode: "drive", travelDate: "2026-09-18" }).ok).toBe(false);
    expect(validateTravelLegInput("departure", { mode: "bus", localDateTime: "2026-09-20T10:15" }).ok).toBe(true);
  });

  it("round-trips Cincinnati wall-clock values across daylight saving time", () => {
    const summer = cincinnatiLocalToUtc("2026-09-18T14:30");
    const winter = cincinnatiLocalToUtc("2026-12-18T14:30");
    expect(summer?.toISOString()).toBe("2026-09-18T18:30:00.000Z");
    expect(winter?.toISOString()).toBe("2026-12-18T19:30:00.000Z");
    expect(toCincinnatiInput(summer)).toBe("2026-09-18T14:30");
  });
});
