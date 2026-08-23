import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import RsvpForm from "@/components/RsvpForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function successfulFetch() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ ok: true }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("RsvpForm submission method", () => {
  it("asks whether guests are local without asking about a hotel", () => {
    render(
      <RsvpForm
        maxPartySize={1}
        invitedNames={["Nickhil"]}
        initial={null}
      />,
    );

    expect(screen.getByText("Are you local to Cincinnati?")).toBeTruthy();
    expect(screen.queryByText(/hotel/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "No, I'm coming from out of town" }));
    expect(screen.getByPlaceholderText("Where are you coming from?")).toBeTruthy();
  });

  it("uses POST for the guest RSVP endpoint by default", async () => {
    const fetchMock = successfulFetch();

    render(
      <RsvpForm
        maxPartySize={1}
        invitedNames={["Nickhil"]}
        initial={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send RSVP" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Send" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/rsvp",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uses PUT when the admin RSVP editor overrides the method", async () => {
    const fetchMock = successfulFetch();

    render(
      <RsvpForm
        maxPartySize={2}
        invitedNames={["Nickhil", "Guest"]}
        initial={{
          attending: true,
          needsHotel: false,
          hometown: "Cincinnati, OH",
          partySize: 1,
          partyMembers: ["Nickhil"],
        }}
        endpoint="/api/admin/guests/42/rsvp"
        method="PUT"
        submitLabel="Save RSVP"
        confirmLabel="Confirm & Save"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Update RSVP" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm & Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/guests/42/rsvp",
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
