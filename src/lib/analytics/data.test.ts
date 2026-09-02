import { describe, expect, it } from "vitest";
import { selectNightTimeAttendees } from "./nightTime";

describe("selectNightTimeAttendees", () => {
  it("includes Yes RSVP names from both friend groups, eligible Yes family friends, and the named Core attendees", () => {
    const rows = selectNightTimeAttendees([
      { id: 1, invitedNames: ["Zoe", "Alex"], groupLabel: "Nick Friends" },
      { id: 2, invitedNames: ["Maya"], groupLabel: "Nikki Friends" },
      { id: 3, invitedNames: ["Nickhil Tekwani", "Nikki Shah", "Natasha", "Abhi Patel", "Someone Else"], groupLabel: "Core" },
      { id: 4, invitedNames: ["Family Guest"], groupLabel: "Nick Fam" },
      { id: 5, invitedNames: ["Declined Friend"], groupLabel: "Nick Friends" },
      { id: 6, invitedNames: ["No Response"], groupLabel: "Nikki Friends" },
      { id: 7, invitedNames: ["Manasa Rao", "Cody Smith", "Other Family Friend"], groupLabel: "Nikki Fam Friends" },
      { id: 8, invitedNames: ["Priya Srinivasan", "Neha Srinivasan", "Rohit Pillai", "Diya Kargod"], groupLabel: "Nikki Fam Friends" },
      { id: 9, invitedNames: ["Suhaas Sameera", "Ananya Tawde", "Disha Adapur", "Vibha Shah", "Vignesh Ramesh", "Nidhi Iyanna", "Amogh Iyanna"], groupLabel: "Nikki Fam Friends" },
      { id: 10, invitedNames: ["Eligible But Declined"], groupLabel: "Nikki Fam Friends" },
    ], [
      { groupId: 1, attending: true, partyMembers: ["Zoe RSVP", "Alex RSVP"] },
      { groupId: 2, attending: true, partyMembers: ["Maya RSVP"] },
      { groupId: 5, attending: false, partyMembers: [] },
      { groupId: 7, attending: true, partyMembers: ["Manasa Rao", "Cody Smith", "Other Family Friend"] },
      { groupId: 8, attending: true, partyMembers: ["Priya Srinivasan", "Neha Srinivasan", "Rohit Pillai", "Diya Kargod"] },
      { groupId: 9, attending: true, partyMembers: ["Suhaas Sameera", "Ananya Tawde", "Disha Adapur", "Vibha Shah", "Vignesh Ramesh", "Nidhi Iyanna", "Amogh Iyanna"] },
      { groupId: 10, attending: false, partyMembers: [] },
    ]);

    expect(rows.map((row) => row.attendee_name)).toEqual([
      "Abhi Patel",
      "Alex RSVP",
      "Amogh Iyanna",
      "Ananya Tawde",
      "Cody Smith",
      "Disha Adapur",
      "Diya Kargod",
      "Manasa Rao",
      "Maya RSVP",
      "Natasha",
      "Neha Srinivasan",
      "Nickhil Tekwani",
      "Nidhi Iyanna",
      "Nikki Shah",
      "Priya Srinivasan",
      "Rohit Pillai",
      "Suhaas Sameera",
      "Vibha Shah",
      "Vignesh Ramesh",
      "Zoe RSVP",
    ]);
    expect(rows).toHaveLength(20);
    expect(rows.every((row) => row.attendee_count === 1)).toBe(true);
  });
});
