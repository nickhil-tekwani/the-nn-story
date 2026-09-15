import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import StayPlanner from "./StayPlanner";

afterEach(cleanup);

const completePlan = {
  partySize: 1,
  partyMembers: ["Taylor Guest"],
  lodging: { lodgingType: "hotel" as const, hotelId: 1, localArea: null, revision: 1 },
  legs: [
    { direction: "arrival" as const, mode: "flight" as const, localDateTime: "2026-09-18T14:30", travelDate: null, timePeriod: null, airlineCode: "UA", otherAirlineName: null, flightNumber: "1487", revision: 1 },
    { direction: "departure" as const, mode: "drive" as const, localDateTime: "", travelDate: "2026-09-20", timePeriod: "morning" as const, airlineCode: null, otherAirlineName: null, flightNumber: null, revision: 1 },
  ],
  hotels: [{ id: 1, canonicalName: "Homewood Suites by Hilton Cincinnati-Downtown", locality: "Cincinnati", region: "OH" }],
  hotelMatches: ["Maya P.", "Arjun S."],
};

describe("StayPlanner", () => {
  it("shows current attending travelers, concise summaries, and private hotel matches", () => {
    render(<StayPlanner initialData={completePlan} firstName="Taylor" />);
    expect(screen.getByText(/1 traveler: Taylor Guest/)).toBeTruthy();
    expect(screen.getByText(/Homewood Suites by Hilton Cincinnati-Downtown/)).toBeTruthy();
    expect(screen.getByText(/Maya P. and Arjun S./)).toBeTruthy();
    expect(screen.getByText(/are staying at your hotel too/)).toBeTruthy();
    expect(screen.getByText(/3 recommendations coming soon/)).toBeTruthy();
  });

  it("opens the first unanswered section to keep the form progressive", () => {
    render(<StayPlanner initialData={{ ...completePlan, lodging: null, legs: [] }} firstName={null} />);
    expect(screen.getByRole("button", { name: "Save stay" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save arrival" })).toBeNull();
  });

  it("warns when a departure is dated before arrival", () => {
    render(<StayPlanner initialData={{
      ...completePlan,
      legs: [
        completePlan.legs[0],
        { ...completePlan.legs[1], travelDate: "2026-09-17" },
      ],
    }} firstName={null} />);
    expect(screen.getByText(/departure is before your arrival/i)).toBeTruthy();
  });

  it("lets admins inspect the guest page without enabling writes", () => {
    render(<StayPlanner initialData={{ ...completePlan, lodging: null, legs: [] }} firstName={null} previewMode />);
    expect(screen.getByText(/Admin preview · Example guest data/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Preview only" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
