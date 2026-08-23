"use client";

import { useEffect } from "react";

/** A one-time notice shown only on the redirect after a secondary member joins. */
export default function JoinedGroupNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("joined");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  return (
    <div
      role="status"
      style={{
        margin: "0 0 1.25rem",
        border: "1px solid rgba(45,106,79,0.2)",
        borderRadius: "0.65rem",
        background: "rgba(45,106,79,0.07)",
        padding: "0.75rem 0.9rem",
        color: "#2d6a4f",
        fontSize: "0.82rem",
        lineHeight: 1.5,
        textAlign: "center",
      }}
    >
      You&apos;re now connected to your group&apos;s existing invitation. Everyone connected to this group shares the same RSVP.
    </div>
  );
}
