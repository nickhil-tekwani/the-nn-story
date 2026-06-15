"use client";

import { useState } from "react";

type InitialRsvp = {
  attending: boolean;
  needsHotel: boolean;
  partySize: number;
  partyMembers: string[];
} | null;

export default function RsvpForm({
  maxPartySize,
  initial,
}: {
  maxPartySize: number;
  initial: InitialRsvp;
}) {
  const [attending, setAttending] = useState<boolean>(initial?.attending ?? true);
  const [needsHotel, setNeedsHotel] = useState<boolean>(
    initial?.needsHotel ?? false,
  );
  const [partySize, setPartySize] = useState<number>(
    initial?.partySize && initial.partySize > 0 ? initial.partySize : 1,
  );
  // One name slot per party member. Grows/shrinks with the party-size select,
  // preserving anything already typed.
  const [names, setNames] = useState<string[]>(() => {
    const start = initial?.partyMembers ?? [];
    const size =
      initial?.partySize && initial.partySize > 0 ? initial.partySize : 1;
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
        body: JSON.stringify({
          attending,
          needsHotel,
          partySize,
          partyMembers: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const partyOptions = Array.from({ length: maxPartySize }, (_, i) => i + 1);

  return (
    <form onSubmit={submit} className="mt-8 space-y-6 text-left">
      <fieldset>
        <legend className="mb-3 font-sans text-xs uppercase tracking-widest text-cream/60">
          Will you be joining us?
        </legend>
        <div className="flex gap-3">
          <Toggle
            active={attending}
            onClick={() => {
              setAttending(true);
              setSaved(false);
            }}
          >
            Joyfully accept
          </Toggle>
          <Toggle
            active={!attending}
            onClick={() => {
              setAttending(false);
              setSaved(false);
            }}
          >
            Regretfully decline
          </Toggle>
        </div>
      </fieldset>

      {attending && (
        <>
          <div>
            <label className="mb-2 block font-sans text-xs uppercase tracking-widest text-cream/60">
              How many in your party? (max {maxPartySize})
            </label>
            <select
              value={partySize}
              onChange={(e) => onPartySizeChange(Number(e.target.value))}
              className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 font-sans text-base text-white focus:border-white/50 focus:outline-none"
            >
              {partyOptions.map((n) => (
                <option key={n} value={n} className="text-black">
                  {n} {n === 1 ? "person" : "people"}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="mb-3 font-sans text-xs uppercase tracking-widest text-cream/60">
              Who&apos;s coming?
            </legend>
            <div className="space-y-2">
              {names.map((name, i) => (
                <input
                  key={i}
                  type="text"
                  value={name}
                  onChange={(e) => onNameChange(i, e.target.value)}
                  placeholder={`Guest ${i + 1} full name`}
                  autoComplete="off"
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 font-sans text-base text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 font-sans text-xs uppercase tracking-widest text-cream/60">
              Where are you staying?
            </legend>
            <div className="flex gap-3">
              <Toggle
                active={needsHotel}
                onClick={() => {
                  setNeedsHotel(true);
                  setSaved(false);
                }}
              >
                I&apos;ll need a hotel
              </Toggle>
              <Toggle
                active={!needsHotel}
                onClick={() => {
                  setNeedsHotel(false);
                  setSaved(false);
                }}
              >
                I&apos;m in the Cincinnati area
              </Toggle>
            </div>
          </fieldset>
        </>
      )}

      {error && <p className="font-sans text-sm text-rose-300">{error}</p>}
      {saved && !error && (
        <p className="font-sans text-sm text-emerald-300">
          Thank you — your RSVP is saved. You can update it anytime.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-white px-6 py-3 font-sans text-sm font-medium text-stone-800 transition hover:bg-stone-100 disabled:opacity-60"
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
      className={`flex-1 rounded-full border px-4 py-3 font-sans text-sm transition ${
        active
          ? "border-white bg-white text-stone-800"
          : "border-white/30 bg-transparent text-cream/80 hover:border-white/60"
      }`}
      style={!active ? { color: "rgba(250,247,242,0.8)" } : undefined}
    >
      {children}
    </button>
  );
}
