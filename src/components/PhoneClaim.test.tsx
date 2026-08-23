import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

import PhoneClaim from "./PhoneClaim";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function submitWithResponse(joinedExistingGroup: boolean) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ ok: true, joinedExistingGroup }),
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<PhoneClaim />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "5135550123" } });
  fireEvent.click(screen.getByRole("button", { name: "Verify invitation" }));
  return fetchMock;
}

describe("PhoneClaim", () => {
  it("routes a secondary member through the one-time joined notice", async () => {
    submitWithResponse(true);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/engagement?joined=existing");
    });
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("refreshes directly for the first connected member", async () => {
    submitWithResponse(false);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(router.replace).not.toHaveBeenCalled();
  });
});
