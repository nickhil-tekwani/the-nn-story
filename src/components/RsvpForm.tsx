"use client";

import { useState } from "react";
import type { DietaryInfo, GroupLabel } from "@/db/schema";

type InitialRsvp = {
  attending: boolean;
  needsHotel: boolean;
  partySize: number;
  partyMembers: string[];
  dietaryRestrictions?: DietaryInfo[];
} | null;

type GuestEntry = {
  name: string;
  attending: boolean;
  editing: boolean;
  isNew?: boolean;
};

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

const OUT_OF_TOWN_LABELS: GroupLabel[] = ["Nikki Friends", "Nick Friends"];

function buildGuests(invitedNames: string[], maxPartySize: number, initial: InitialRsvp): GuestEntry[] {
  const base = invitedNames.length > 0
    ? invitedNames
    : Array.from({ length: maxPartySize }, (_, i) => `Guest ${i + 1}`);

  const attendingSet = new Set(initial?.attending ? (initial.partyMembers ?? []) : []);

  const guests: GuestEntry[] = base.map((name) => ({
    name,
    attending: attendingSet.has(name),
    editing: false,
  }));

  // Re-attach any extra guests that were previously added beyond the base list.
  if (initial?.attending) {
    for (const member of initial.partyMembers ?? []) {
      if (!base.includes(member)) {
        guests.push({ name: member, attending: true, editing: false, isNew: true });
      }
    }
  }

  // First load with no prior RSVP — default the first guest to attending.
  if (!initial && guests.length > 0) {
    guests[0].attending = true;
  }

  return guests;
}

function buildDietary(guests: GuestEntry[], initial: InitialRsvp): DietaryInfo[] {
  // Indexed parallel to guests (full list). Matched by name from the prior RSVP.
  const dietMap = new Map<string, DietaryInfo>(
    (initial?.partyMembers ?? []).map((name, i) => [
      name,
      initial?.dietaryRestrictions?.[i] ?? emptyDiet(),
    ])
  );
  return guests.map((g) => dietMap.get(g.name) ?? emptyDiet());
}

export default function RsvpForm({
  maxPartySize,
  invitedNames,
  initial,
  groupLabel,
}: {
  maxPartySize: number;
  invitedNames: string[];
  initial: InitialRsvp;
  groupLabel?: GroupLabel | null;
}) {
  const [attending, setAttending] = useState<boolean>(initial?.attending ?? true);
  const [needsHotel, setNeedsHotel] = useState<boolean>(initial?.needsHotel ?? false);
  const [guests, setGuests] = useState<GuestEntry[]>(() =>
    buildGuests(invitedNames, maxPartySize, initial)
  );
  const [dietary, setDietary] = useState<DietaryInfo[]>(() =>
    buildDietary(buildGuests(invitedNames, maxPartySize, initial), initial)
  );
  const [vegMode, setVegMode] = useState<boolean[]>(() =>
    buildGuests(invitedNames, maxPartySize, initial).map(() => false)
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(Boolean(initial));
  const [loading, setLoading] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const [displayedRsvp, setDisplayedRsvp] = useState<{ attending: boolean; partySize: number } | null>(
    initial ? { attending: initial.attending, partySize: initial.partySize } : null
  );

  // Attending guests with their index into the full guests/dietary arrays.
  const attendingGuests = guests
    .map((g, i) => ({ ...g, idx: i }))
    .filter((g) => g.attending);

  function toggleGuest(guestIdx: number, checked: boolean) {
    setGuests((prev) => prev.map((g, i) => (i === guestIdx ? { ...g, attending: checked } : g)));
    setSaved(false);
    setConfirmPending(false);
  }

  function startEditing(guestIdx: number) {
    setGuests((prev) => prev.map((g, i) => (i === guestIdx ? { ...g, editing: true } : g)));
  }

  function onNameChange(guestIdx: number, value: string) {
    setGuests((prev) => prev.map((g, i) => (i === guestIdx ? { ...g, name: value } : g)));
    setSaved(false);
  }

  function commitEdit(guestIdx: number) {
    const g = guests[guestIdx];
    if (!g.name.trim() && g.isNew) {
      // Remove blank new-guest rows on blur.
      setGuests((prev) => prev.filter((_, i) => i !== guestIdx));
      setDietary((prev) => prev.filter((_, i) => i !== guestIdx));
      setVegMode((prev) => prev.filter((_, i) => i !== guestIdx));
      return;
    }
    setGuests((prev) =>
      prev.map((g, i) =>
        i === guestIdx ? { ...g, name: g.name.trim() || g.name, editing: false } : g
      )
    );
  }

  function addGuest() {
    if (guests.length >= maxPartySize) return;
    setGuests((prev) => [...prev, { name: "", attending: true, editing: true, isNew: true }]);
    setDietary((prev) => [...prev, emptyDiet()]);
    setVegMode((prev) => [...prev, false]);
    setSaved(false);
  }

  function onDietaryCheck(guestIdx: number, key: keyof Omit<DietaryInfo, "allergies">, checked: boolean) {
    setDietary((prev) => prev.map((d, i) => (i === guestIdx ? { ...d, [key]: checked } : d)));
    setSaved(false);
  }

  function onAllergies(guestIdx: number, value: string) {
    setDietary((prev) => prev.map((d, i) => (i === guestIdx ? { ...d, allergies: value } : d)));
    setSaved(false);
  }

  function selectAll(guestIdx: number) {
    // all/none always clears veg mode first
    setVegMode((prev) => prev.map((v, i) => (i === guestIdx ? false : v)));
    const allChecked = PROTEINS.every((p) => dietary[guestIdx][p.key]);
    setDietary((prev) =>
      prev.map((d, i) => {
        if (i !== guestIdx) return d;
        return { ...d, ...Object.fromEntries(PROTEINS.map((p) => [p.key, !allChecked])) };
      })
    );
    setSaved(false);
  }

  function toggleVeg(guestIdx: number) {
    const turningOn = !vegMode[guestIdx];
    setVegMode((prev) => prev.map((v, i) => (i === guestIdx ? !v : v)));
    if (turningOn) {
      // Uncheck all non-egg proteins
      setDietary((prev) =>
        prev.map((d, i) =>
          i === guestIdx
            ? { ...d, chicken: false, turkey: false, beef: false, pork: false, fish: false }
            : d
        )
      );
    }
    setSaved(false);
  }

  function validate(): string | null {
    if (!attending) return null;
    if (attendingGuests.length === 0) return "Please check at least one attending guest.";
    if (attendingGuests.some((g) => !g.name.trim())) return "Please enter a name for all attending guests.";
    return null;
  }

  function handleSubmitClick(e: React.FormEvent) {
    e.preventDefault();
    if (!attending) return; // decline is handled by the inline confirm box
    setError(null);
    setSaved(false);
    const err = validate();
    if (err) { setError(err); return; }
    setConfirmPending(true);
  }

  async function doSend() {
    const partySize = attending ? attendingGuests.length : 0;
    const partyMembers = attending ? attendingGuests.map((g) => g.name.trim()) : [];
    const dietaryRestrictions = attending ? attendingGuests.map((g) => dietary[g.idx]) : [];
    const allNames = guests.map((g) => g.name.trim()).filter(Boolean);

    setLoading(true);
    setConfirmPending(false);
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attending, needsHotel, partySize, partyMembers, dietaryRestrictions, invitedNames: allNames }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setSaved(true);
      setDisplayedRsvp({ attending, partySize });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const legendStyle: React.CSSProperties = {
    fontSize: "0.7rem",
    letterSpacing: "0.24em",
    textTransform: "uppercase",
    color: "var(--ink-muted)",
    marginBottom: "0.6rem",
    display: "block",
  };

  return (
    <>
      {displayedRsvp !== null && (() => {
        const ps = displayedRsvp.partySize;
        const declined = !displayedRsvp.attending;
        const full = !declined && ps === maxPartySize;
        const bg    = declined ? "rgba(155,28,28,0.1)" : full ? "rgba(45,106,79,0.1)" : "rgba(146,64,14,0.1)";
        const color = declined ? "#9b1c1c"              : full ? "#2d6a4f"             : "#92400e";
        return (
          <div style={{ textAlign: "center", marginBottom: "1.1rem" }}>
            <span style={{
              display: "inline-block",
              padding: "0.2rem 0.8rem",
              borderRadius: "999px",
              fontSize: "0.78rem",
              letterSpacing: "0.03em",
              background: bg,
              color,
            }}>
              {`${ps}/${maxPartySize} attending`}
            </span>
          </div>
        );
      })()}
    <form onSubmit={handleSubmitClick} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Accept / decline */}
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={legendStyle}>Will you be joining us?</legend>
        <div style={{ display: "flex", gap: "0.5rem", width: "100%" }}>
          <Toggle active={attending} onClick={() => { setAttending(true); setSaved(false); setConfirmPending(false); }}>
            Joyfully accept
          </Toggle>
          <Toggle active={!attending} onClick={() => { setAttending(false); setSaved(false); setConfirmPending(false); }}>
            Regretfully decline
          </Toggle>
        </div>
      </fieldset>

      {attending && (
        <>
          {/* Guest list */}
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={legendStyle}>Who&apos;s coming?</legend>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {guests.map((g, i) => (
                <GuestRow
                  key={i}
                  guest={g}
                  onToggle={(checked) => toggleGuest(i, checked)}
                  onEdit={() => startEditing(i)}
                  onNameChange={(val) => onNameChange(i, val)}
                  onCommit={() => commitEdit(i)}
                />
              ))}
            </div>
            {guests.length < maxPartySize && (
              <button
                type="button"
                onClick={addGuest}
                style={{
                  marginTop: "0.6rem",
                  background: "none",
                  border: "none",
                  padding: 0,
                  fontFamily: "var(--font-pt), serif",
                  fontSize: "0.8rem",
                  color: "var(--ink-muted)",
                  cursor: "pointer",
                  letterSpacing: "0.02em",
                }}
              >
                + Add a guest
              </button>
            )}
          </fieldset>

          {/* Dietary — only shown when at least one guest is attending */}
          {attendingGuests.length > 0 && (
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ ...legendStyle, marginBottom: "0.25rem" }}>
                Dietary preferences
              </legend>
              <p style={{ fontSize: "0.78rem", color: "var(--ink-muted)", margin: "0 0 0.75rem", lineHeight: 1.5 }}>
                Check the items each person eats.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.82rem" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "0.4rem 0.75rem 0.4rem 0", color: "var(--ink-muted)", fontWeight: 500, whiteSpace: "nowrap" }} />
                      {attendingGuests.map((g, col) => (
                        <th key={col} style={{ textAlign: "center", padding: "0.4rem 0.75rem", color: "var(--ink-warm)", fontWeight: 500, whiteSpace: "nowrap", minWidth: "5rem" }}>
                          {g.name.trim() || "Guest"}
                          <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center", marginTop: "0.2rem" }}>
                            <button
                              type="button"
                              onClick={() => selectAll(g.idx)}
                              className="dietary-all-btn"
                            >
                              {PROTEINS.every((p) => dietary[g.idx][p.key]) ? "clear" : "all"}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleVeg(g.idx)}
                              className="dietary-all-btn"
                              style={vegMode[g.idx] ? { borderColor: "#2d6a4f", color: "#2d6a4f" } : {}}
                            >
                              veg
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PROTEINS.map(({ key, label }) => (
                      <tr key={key} style={{ borderTop: "1px solid rgba(26,22,19,0.08)" }}>
                        <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
                          {label}
                        </td>
                        {attendingGuests.map((g, col) => {
                          const grayed = vegMode[g.idx] && key !== "egg";
                          return (
                            <td key={col} style={{ textAlign: "center", padding: "0.45rem 0.75rem", opacity: grayed ? 0.25 : 1, transition: "opacity 0.2s ease" }}>
                              <input
                                type="checkbox"
                                checked={dietary[g.idx][key]}
                                disabled={grayed}
                                onChange={(e) => onDietaryCheck(g.idx, key, e.target.checked)}
                                style={{ accentColor: "var(--ink-warm)", width: "1rem", height: "1rem", cursor: grayed ? "default" : "pointer" }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr style={{ borderTop: "1px solid rgba(26,22,19,0.08)" }}>
                      <td style={{ padding: "0.45rem 0.75rem 0.45rem 0", color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
                        Allergies / other
                      </td>
                      {attendingGuests.map((g, col) => (
                        <td key={col} style={{ padding: "0.35rem 0.5rem" }}>
                          <input
                            type="text"
                            value={dietary[g.idx].allergies}
                            onChange={(e) => onAllergies(g.idx, e.target.value)}
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
          )}

          {/* Hotel */}
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={legendStyle}>Where are you staying?</legend>
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
                {groupLabel && OUT_OF_TOWN_LABELS.includes(groupLabel) && "Plan to stay in downtown Cincinnati. "}
                Depending on out-of-town attendance, we may put together a room block — stay tuned!
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

      {attending ? (
        <>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              borderRadius: "999px",
              background: confirmPending ? "transparent" : "var(--ink-warm)",
              color: confirmPending ? "var(--ink-muted)" : "var(--paper)",
              border: confirmPending ? "1px solid rgba(26,22,19,0.2)" : "none",
              padding: "0.75rem 1.5rem",
              fontFamily: "var(--font-pt), serif",
              fontSize: "0.9rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : undefined,
              transition: "all 0.25s ease",
            }}
          >
            {loading ? "Saving…" : confirmPending ? "Edit" : saved ? "Update RSVP" : "Send RSVP"}
          </button>

          {confirmPending && (
            <div style={{
              borderRadius: "0.75rem",
              border: "1px solid rgba(26,22,19,0.12)",
              padding: "1rem 1.1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              animation: "fadeSlideIn 0.2s ease forwards",
            }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-mid)", lineHeight: 1.55 }}>
                <strong style={{ color: "var(--ink-warm)", fontWeight: 600 }}>
                  {attendingGuests.length}/{guests.length}
                </strong>{" "}
                {attendingGuests.length === 1 ? "person" : "people"} in your party{" "}
                {attendingGuests.length === 1 ? "is" : "are"} going to be marked as attending.
                Please confirm this is correct before submitting.
              </p>
              <button
                type="button"
                onClick={doSend}
                style={{
                  width: "100%",
                  borderRadius: "999px",
                  background: "var(--ink-warm)",
                  color: "var(--paper)",
                  border: "none",
                  padding: "0.7rem 1.5rem",
                  fontFamily: "var(--font-pt), serif",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "opacity 0.2s ease",
                }}
              >
                Confirm &amp; Send
              </button>
            </div>
          )}
        </>
      ) : saved ? null : (
        <div style={{
          borderRadius: "0.75rem",
          border: "1px solid rgba(26,22,19,0.12)",
          padding: "1rem 1.1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          animation: "fadeSlideIn 0.2s ease forwards",
        }}>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-mid)", lineHeight: 1.55 }}>
            Declining will RSVP no for all members of your party
            {guests.filter((g) => g.name.trim()).length > 0
              ? `: ${guests.map((g) => g.name.trim()).filter(Boolean).join(", ")}`
              : ""}
            .
          </p>
          <button
            type="button"
            onClick={doSend}
            disabled={loading}
            style={{
              width: "100%",
              borderRadius: "999px",
              background: "var(--ink-warm)",
              color: "var(--paper)",
              border: "none",
              padding: "0.7rem 1.5rem",
              fontFamily: "var(--font-pt), serif",
              fontSize: "0.9rem",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : undefined,
              transition: "opacity 0.2s ease",
            }}
          >
            {loading ? "Saving…" : "Confirm & Decline"}
          </button>
        </div>
      )}
    </form>
    </>
  );
}

function GuestRow({
  guest,
  onToggle,
  onEdit,
  onNameChange,
  onCommit,
}: {
  guest: GuestEntry;
  onToggle: (checked: boolean) => void;
  onEdit: () => void;
  onNameChange: (val: string) => void;
  onCommit: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minHeight: "2rem" }}>
      <input
        type="checkbox"
        checked={guest.attending}
        onChange={(e) => onToggle(e.target.checked)}
        style={{ accentColor: "var(--ink-warm)", width: "1rem", height: "1rem", cursor: "pointer", flexShrink: 0 }}
      />
      {guest.editing ? (
        <input
          autoFocus
          type="text"
          value={guest.name}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => e.key === "Enter" && onCommit()}
          placeholder="Full name"
          style={{
            flex: 1,
            borderRadius: "0.4rem",
            border: "1px solid rgba(26,22,19,0.18)",
            background: "var(--paper)",
            padding: "0.3rem 0.6rem",
            fontFamily: "var(--font-pt), serif",
            fontSize: "0.9rem",
            color: "var(--ink-warm)",
            outline: "none",
          }}
        />
      ) : (
        <>
          <span style={{ flex: 1, fontSize: "0.9rem", color: guest.name ? "var(--ink-warm)" : "var(--ink-muted)" }}>
            {guest.name || "Add name"}
          </span>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit name"
            style={{ background: "none", border: "none", padding: "0.1rem", cursor: "pointer", color: "var(--ink-muted)", flexShrink: 0, lineHeight: 1 }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61a.75.75 0 0 1-.35.195l-3.5.875a.75.75 0 0 1-.91-.91l.875-3.5a.75.75 0 0 1 .196-.35l8.61-8.61z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      )}
    </div>
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
