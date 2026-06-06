"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PhoneClaim() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      // Re-render the server page, which now shows the event details + RSVP.
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/15 bg-black/40 p-8 backdrop-blur-md">
      <h2 className="mb-2 text-2xl">Confirm your invitation</h2>
      <p className="mb-6 font-sans text-sm text-cream/70" style={{ color: "rgba(250,247,242,0.7)" }}>
        Enter the phone number where you received your invite so we can match you
        to the guest list.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(513) 555-0142"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 font-sans text-base text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none"
          required
        />
        {error && (
          <p className="font-sans text-sm text-rose-300">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-white px-6 py-3 font-sans text-sm font-medium text-stone-800 transition hover:bg-stone-100 disabled:opacity-60"
        >
          {loading ? "Checking…" : "Verify invitation"}
        </button>
      </form>
    </div>
  );
}
