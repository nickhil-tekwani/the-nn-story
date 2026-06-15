"use client";

import { useState } from "react";

type InitialRsvp = {
  attending: boolean;
  needsHotel: boolean;
  partySize: number;
  partyMembers: string[];
} | null;

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.5rem",
  border: "1px solid rgba(26,22,19,0.18)",
  background: "var(--paper)",
  padding: "0.65rem 1rem",
  fontFamily: "var(--font-pt), serif",
  fontSize: "1rem",
  color: "var(--ink-warm)",
  outline: "none",
  boxSizing: "border-box",
};

export default function RsvpForm({
  maxPartySize,
  initial,
}: {
  maxPartySize: number;
  initial: InitialRsvp;
}) {
  const [attending, setAttending] = useState<boolean>(initial?.attending ?? true);
  const [needsHotel, setNeedsHotel] = useState<boolean>(initial?.needsHotel ?? false);
  const [partySize, setPartySize] = useState<number>(
    initial?.partySize && initial.partySize > 0 ? initial.partySize : 1,
  );
  const [names, setNames] = useState<string[]>(() => {
    const start = initial?.partyMembers ?? [];
    const size = initial?.partySize && initial.partySize > 0 ? initial.partySize : 1;
    return Array.from({ length: size }, (_, i) => start[i] ?? "");
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(Boolean(initial));
  const [loading, setLoading] = useState(false);

  function onPartySizeChange(size: number) {
    setPartySize(size);
    setNames((prev) => Array.from({ length: size }, (_, i) => prev[i] ?? ""));
    setSaved(false);
  }

  function onNameChange(index: number, value: string) {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)));
    setSaved(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const trimmed = names.map((n) => n.trim());
    if (attending && trimmed.some((n) => !n)) {
      setError("Please enter a name for everyone in your party.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attending, needsHotel, partySize, partyMembers: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setSaved(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const partyOptions = Array.from({ length: maxPartySize }, (_, i) => i + 1);

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontSize: "0.7rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "0.6rem", display: "block" }}>
          Will you be joining us?
        </legend>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Toggle active={attending} onClick={() => { setAttending(true); setSaved(false); }}>
            Joyfully accept
          </Toggle>
          <Toggle active={!attending} onClick={() => { setAttending(false); setSaved(false); }}>
            Regretfully decline
          </Toggle>
        </div>
      </fieldset>

      {attending && (
        <>
          <div>
            <label style={{ fontSize: "0.7rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "0.5rem", display: "block" }}>
              How many in your party? (max {maxPartySize})
            </label>
            <select
              value={partySize}
              onChange={(e) => onPartySizeChange(Number(e.target.value))}
              style={inputStyle}
            >
              {partyOptions.map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
              ))}
            </select>
          </div>

          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontSize: "0.7rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "0.6rem", display: "block" }}>
              Who&apos;s coming?
            </legend>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {names.map((name, i) => (
                <input
                  key={i}
                  type="text"
                  value={name}
                  onChange={(e) => onNameChange(i, e.target.value)}
                  placeholder={`Guest ${i + 1} full name`}
                  autoComplete="off"
                  style={inputStyle}
                />
              ))}
            </div>
          </fieldset>

          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontSize: "0.7rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "0.6rem", display: "block" }}>
              Where are you staying?
            </legend>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Toggle active={needsHotel} onClick={() => { setNeedsHotel(true); setSaved(false); }}>
                I&apos;ll need a hotel
              </Toggle>
              <Toggle active={!needsHotel} onClick={() => { setNeedsHotel(false); setSaved(false); }}>
                I&apos;m local
              </Toggle>
            </div>
          </fieldset>
        </>
      )}

      {error && <p style={{ fontSize: "0.85rem", color: "#9b1c1c" }}>{error}</p>}
      {saved && !error && (
        <p style={{ fontSize: "0.85rem", color: "#2d6a4f" }}>
          Thank you — your RSVP is saved. You can update it anytime.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          borderRadius: "999px",
          background: "var(--ink-warm)",
          color: "var(--paper)",
          border: "none",
          padding: "0.75rem 1.5rem",
          fontFamily: "var(--font-pt), serif",
          fontSize: "0.9rem",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        {loading ? "Saving…" : saved ? "Update RSVP" : "Send RSVP"}
      </button>
    </form>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        borderRadius: "999px",
        border: active ? "1px solid var(--ink-warm)" : "1px solid rgba(26,22,19,0.2)",
        background: active ? "var(--ink-warm)" : "transparent",
        color: active ? "var(--paper)" : "var(--ink-muted)",
        padding: "0.6rem 1rem",
        fontFamily: "var(--font-pt), serif",
        fontSize: "0.88rem",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      {children}
    </button>
  );
}
