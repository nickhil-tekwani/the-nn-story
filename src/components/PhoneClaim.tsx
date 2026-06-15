"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES, DEFAULT_COUNTRY, toE164 } from "@/lib/phone";

const inputStyle: React.CSSProperties = {
  borderRadius: "0.5rem",
  border: "1px solid rgba(26,22,19,0.18)",
  background: "var(--paper)",
  padding: "0.65rem 1rem",
  fontFamily: "var(--font-pt), serif",
  fontSize: "1rem",
  color: "var(--ink-warm)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export default function PhoneClaim() {
  const router = useRouter();
  const [dial, setDial] = useState(DEFAULT_COUNTRY.dial);
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const country = COUNTRIES.find((c) => c.dial === dial) ?? DEFAULT_COUNTRY;
  const needed = country.nationalDigits;
  const complete = digits.length === needed;

  function onDigitsChange(value: string) {
    setDigits(value.replace(/\D/g, "").slice(0, needed));
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
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2
        style={{
          fontFamily: "var(--font-gilda), serif",
          fontWeight: 400,
          fontSize: "1.4rem",
          color: "var(--ink-warm)",
          margin: "0 0 0.5rem",
          textAlign: "center",
        }}
      >
        Confirm your invitation
      </h2>
      <p style={{ fontSize: "0.88rem", color: "var(--ink-muted)", marginBottom: "1.25rem", textAlign: "center" }}>
        Enter the phone number where you received your invite.
      </p>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <select
            value={dial}
            onChange={(e) => { setDial(e.target.value); setDigits(""); setError(null); }}
            aria-label="Country code"
            style={{ ...inputStyle, width: "auto", paddingLeft: "0.75rem", paddingRight: "0.75rem" }}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.dial}>{c.label}</option>
            ))}
          </select>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder={"".padStart(needed, "0")}
            value={digits}
            onChange={(e) => onDigitsChange(e.target.value)}
            style={inputStyle}
            required
          />
        </div>

        <p style={{ fontSize: "0.75rem", color: complete ? "#2d6a4f" : "var(--ink-faint)" }}>
          {digits.length} / {needed} digits
        </p>

        {error && (
          <p style={{ fontSize: "0.85rem", color: "#9b1c1c" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !complete}
          style={{
            marginTop: "0.5rem",
            width: "100%",
            borderRadius: "999px",
            background: complete && !loading ? "var(--ink-warm)" : "rgba(26,22,19,0.25)",
            color: "var(--paper)",
            border: "none",
            padding: "0.75rem 1.5rem",
            fontFamily: "var(--font-pt), serif",
            fontSize: "0.9rem",
            cursor: complete && !loading ? "pointer" : "not-allowed",
            transition: "background 0.2s ease",
          }}
        >
          {loading ? "Checking…" : "Verify invitation"}
        </button>
      </form>
    </div>
  );
}
