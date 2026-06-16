"use client";

import { useState } from "react";
import type { DietaryInfo } from "@/db/schema";

type InitialRsvp = {
  attending: boolean;
  needsHotel: boolean;
  partySize: number;
  partyMembers: string[];
  dietaryRestrictions?: DietaryInfo[];
} | null;

const PROTEINS: { key: keyof Omit<DietaryInfo, "allergies">; label: string }[] = [
  { key: "chicken", label: "Chicken" },
  { key: "turkey",  label: "Turkey"  },
  { key: "beef",    label: "Beef"    },
  { key: "pork",    label: "Pork"    },
  { key: "fish",    label: "Fish"    },
  { key: "egg",     label: "Egg"     },
];

function emptyDiet(): DietaryInfo {
  return { chicken: false, turkey: false, beef: false, pork: false, fish: false, egg: false, allergies: "" };
}

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
  const [dietary, setDietary] = useState<DietaryInfo[]>(() => {
    const start = initial?.dietaryRestrictions ?? [];
    const size = initial?.partySize && initial.partySize > 0 ? initial.partySize : 1;
    return Array.from({ length: size }, (_, i) => start[i] ?? emptyDiet());
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(Boolean(initial));
  const [loading, setLoading] = useState(false);

  function onPartySizeChange(size: number) {
    setPartySize(size);
    setNames((prev) => Array.from({ length: size }, (_, i) => prev[i] ?? ""));
    setDietary((prev) => Array.from({ length: size }, (_, i) => prev[i] ?? emptyDiet()));
    setSaved(false);
  }

  function onDietaryCheck(guestIdx: number, key: keyof Omit<DietaryInfo, "allergies">, checked: boolean) {
    setDietary((prev) => prev.map((d, i) => i === guestIdx ? { ...d, [key]: checked } : d));
    setSaved(false);
  }

  function onAllergies(guestIdx: number, value: string) {
    setDietary((prev) => prev.map((d, i) => i === guestIdx ? { ...d, allergies: value } : d));
    setSaved(false);
  }

  function selectAll(guestIdx: number) {
    const allChecked = PROTEINS.every((p) => dietary[guestIdx][p.key]);
    setDietary((prev) => prev.map((d, i) => {
      if (i !== guestIdx) return d;
      const toggled = Object.fromEntries(PROTEINS.map((p) => [p.key, !allChecked]));
      return { ...d, ...toggled };
    }));
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
        body: JSON.stringify({ attending, needsHotel, partySize, partyMembers: trimmed, dietaryRestrictions: dietary }),
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
            <legend style={{ fontSize: "0.7rem", letterSpacing: "0.24em", textTransform: "uppercase", color: "var(--ink-muted)", marginBottom: "0.25rem", display: "block" }}>
              Dietary preferences
            </legend>
            <p style={{ fontSize: "0.78rem", color: "var(--ink-muted)", margin: "0 0 0.75rem", lineHeight: 1.5 }}>
              Check the items each person eats.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.82rem" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.4rem 0.75rem 0.4rem 0", color: "var(--ink-muted)", fontWeight: 500, whiteSpace: "nowrap" }}></th>
                    {names.map((n, i) => (
                      <th key={i} style={{ textAlign: "center", padding: "0.4rem 0.75rem", color: "var(--ink-warm)", fontWeight: 500, whiteSpace: "nowrap", minWidth: "5rem" }}>
                        {n.trim() || `Guest ${i + 1}`}
                        <div>
                          <button
                            type="button"
                            onClick={() => selectAll(i)}
                            style={{ fontSize: "0.68rem", color: "var(--ink-muted)", background: "none", border: "none", cursor: "pointer", padding: "0.1rem 0", fontFamily: "var(--font-pt), serif", letterSpacing: "0.04em" }}
                          >
                            {PROTEINS.every((p) => dietary[i][p.key]) ? "none" : "all"}
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PROTEINS.map(({ key, label }) => (
                    <tr key={key} style={{ borderTop: "1px solid rgba(26,22,19,0.08)" }}>
                      <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "var(--ink-muted)", whiteSpace: "nowrap" }}>{label}</td>
                      {dietary.map((d, i) => (
                        <td key={i} style={{ textAlign: "center", padding: "0.45rem 0.75rem" }}>
                          <input
                            type="checkbox"
                            checked={d[key]}
                            onChange={(e) => onDietaryCheck(i, key, e.target.checked)}
                            style={{ accentColor: "var(--ink-warm)", width: "1rem", height: "1rem", cursor: "pointer" }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr style={{ borderTop: "1px solid rgba(26,22,19,0.08)" }}>
                    <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "var(--ink-muted)", whiteSpace: "nowrap" }}>Allergies / other</td>
                    {dietary.map((d, i) => (
                      <td key={i} style={{ padding: "0.35rem 0.5rem" }}>
                        <input
                          type="text"
                          value={d.allergies}
                          onChange={(e) => onAllergies(i, e.target.value)}
                          placeholder="e.g. nuts"
                          style={{ ...inputStyle, fontSize: "0.8rem", padding: "0.35rem 0.6rem", minWidth: "4.5rem" }}
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
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
            {needsHotel && (
              <p style={{ fontSize: "0.82rem", color: "var(--ink-muted)", margin: "0.6rem 0 0", lineHeight: 1.55 }}>
                Plan to stay in downtown Cincinnati. Depending on out-of-town attendance, we may put together a room block — stay tuned!
              </p>
            )}
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
