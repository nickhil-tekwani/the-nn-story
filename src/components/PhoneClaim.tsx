"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES, DEFAULT_COUNTRY, toE164 } from "@/lib/phone";

export default function PhoneClaim() {
  const router = useRouter();
  const [dial, setDial] = useState(DEFAULT_COUNTRY.dial);
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const country =
    COUNTRIES.find((c) => c.dial === dial) ?? DEFAULT_COUNTRY;
  const needed = country.nationalDigits;
  const complete = digits.length === needed;

  function onDigitsChange(value: string) {
    // Strip everything that isn't a digit (no dashes/spaces/parens) and cap
    // the length to the selected country's national number length.
    const cleaned = value.replace(/\D/g, "").slice(0, needed);
    setDigits(cleaned);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const e164 = toE164(dial, digits);
    if (!e164) {
      setError(`Please enter a ${needed}-digit number for ${country.label}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164 }),
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
      <p
        className="mb-6 font-sans text-sm text-cream/70"
        style={{ color: "rgba(250,247,242,0.7)" }}
      >
        Enter the phone number where you received your invite so we can match you
        to the guest list.
      </p>
      <form onSubmit={submit} className="space-y-2">
        <div className="flex gap-2">
          <select
            value={dial}
            onChange={(e) => {
              setDial(e.target.value);
              setDigits(""); // reset so the count check matches the new country
              setError(null);
            }}
            aria-label="Country code"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-3 font-sans text-base text-white focus:border-white/50 focus:outline-none"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.dial} className="text-black">
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder={"".padStart(needed, "0")}
            value={digits}
            onChange={(e) => onDigitsChange(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 font-sans text-base tracking-wide text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
            required
          />
        </div>

        <p
          className="font-sans text-xs"
          style={{
            color: complete
              ? "rgba(110,231,183,0.9)"
              : "rgba(250,247,242,0.5)",
          }}
        >
          {digits.length} / {needed} digits
        </p>

        {error && <p className="font-sans text-sm text-rose-300">{error}</p>}

        <button
          type="submit"
          disabled={loading || !complete}
          className="mt-2 w-full rounded-full bg-white px-6 py-3 font-sans text-sm font-medium text-stone-800 transition hover:bg-stone-100 disabled:opacity-50"
        >
          {loading ? "Checking…" : "Verify invitation"}
        </button>
      </form>
    </div>
  );
}
