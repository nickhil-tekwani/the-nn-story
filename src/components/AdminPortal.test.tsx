import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminPortal from "./AdminPortal";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const group = {
  id: 4,
  invitedNames: ["First Guest", "Second Guest"],
  phones: ["+15135550123", "+15135550124"],
  maxPartySize: 2,
  groupLabel: "Core",
  members: [
    { id: 10, email: "first@gmail.com", phone: "+15135550123", joinedAt: "2026-08-01T12:00:00Z" },
    { id: 11, email: "second@gmail.com", phone: "+15135550124", joinedAt: "2026-08-02T12:00:00Z" },
  ],
  attending: true,
  needsHotel: false,
  hometown: "Cincinnati, OH",
  partySize: 2,
  partyMembers: ["First Guest", "Second Guest"],
  dietaryRestrictions: [],
};

describe("AdminPortal connected accounts", () => {
  it("lists every account and removes only the selected membership", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/members/11")) {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: true, json: async () => ({ groups: [group] }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPortal />);

    await screen.findByText("first@gmail.com");
    expect(screen.getByText("second@gmail.com")).toBeTruthy();
    expect(screen.getByText("2/2 connected")).toBeTruthy();

    const removeButtons = screen.getAllByRole("button", { name: "Remove access" });
    fireEvent.click(removeButtons[1]);
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/guests/4/members/11",
        { method: "DELETE" },
      );
    });
  });
});
