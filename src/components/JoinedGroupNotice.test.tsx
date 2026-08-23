import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import JoinedGroupNotice from "./JoinedGroupNotice";

describe("JoinedGroupNotice", () => {
  it("shows shared-RSVP context and removes its one-time URL marker", async () => {
    window.history.replaceState({}, "", "/engagement?joined=existing&keep=yes");

    render(<JoinedGroupNotice />);

    expect(screen.getByRole("status").textContent).toMatch(/shares the same RSVP/i);
    await waitFor(() => {
      expect(window.location.pathname + window.location.search).toBe("/engagement?keep=yes");
    });
  });
});
