"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/AuthButtons";
import { formatPhone } from "@/lib/phone";

type GroupRow = {
  id: number;
  invitedNames: string[];
  phones: string[];
  maxPartySize: number;
  claimedByEmail: string | null;
  claimedByPhone: string | null;
  attending: boolean | null;
  needsHotel: boolean | null;
  partySize: number | null;
  partyMembers: string[];
};

const BORDER = "1px solid rgba(26,22,19,0.12)";
const MUTED = "var(--ink-muted)";
const INK = "var(--ink-warm)";
const PAPER = "var(--paper)";
const STAR = "#c1121f";

export default function AdminPortal() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [csv, setCsv] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/guests");
    if (res.ok) {
      const data = await res.json();
      setGroups(data.groups);
      setSelected(new Set());
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsv((ev.target?.result as string) ?? "");
    reader.readAsText(file);
    e.target.value = "";
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus(data.error || "Upload failed."); return; }
      const errs = (data.errors as string[]) ?? [];
      setStatus(
        `Created ${data.created}, updated ${data.updated} group(s).` +
          (errs.length ? ` Skipped ${errs.length}: ${errs.join(" ")}` : ""),
      );
      setCsv("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === groups.length ? new Set() : new Set(groups.map((g) => g.id)),
    );
  }

  async function bulkAction(method: "DELETE" | "PATCH") {
    setBulkLoading(true);
    try {
      await Promise.all([...selected].map((id) => fetch(`/api/admin/guests/${id}`, { method })));
      await load();
    } finally {
      setBulkLoading(false);
    }
  }

  const allSelected = groups.length > 0 && selected.size === groups.length;
  const someSelected = selected.size > 0;
  const attendingCount = groups
    .filter((g) => g.attending)
    .reduce((sum, g) => sum + (g.partySize ?? 0), 0);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: PAPER,
        padding: "2.5rem 1.5rem",
        fontFamily: "var(--font-pt), Georgia, serif",
        color: INK,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "var(--font-gilda), serif", fontWeight: 400, fontSize: "1.8rem", margin: 0 }}>
            Guest Admin <span style={{ color: STAR }}>★</span>
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.85rem" }}>
            <Link href="/engagement" style={{ color: MUTED, textDecoration: "underline" }}>View site</Link>
            <SignOutButton />
          </div>
        </header>

        {/* Upload */}
        <section
          style={{
            marginBottom: "2.5rem",
            border: BORDER,
            borderRadius: "0.75rem",
            padding: "1.5rem",
            background: "#faf9f6",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-gilda), serif", fontWeight: 400, fontSize: "1.2rem", margin: "0 0 0.5rem" }}>
            Add / update groups
          </h2>
          <p style={{ fontSize: "0.85rem", color: MUTED, margin: "0 0 1rem", lineHeight: 1.6 }}>
            Paste CSV rows with two columns: <code>names, phones</code>. Each cell is a list separated by{" "}
            <code>;</code> or <code>|</code>. The number of names sets the group&apos;s max party size. Any phone can
            claim the invite. Re-uploading matches by shared phone (claims &amp; RSVPs preserved). Bare 10-digit numbers
            treated as US; prefix India with <code>+91</code>.
          </p>
          <form onSubmit={upload}>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={5}
              placeholder={`"Nick Tekwani; Nikki; Mom", "+1 513 555 0142; +1 513 555 0143"\n"Alex Doe", "513-555-0199"`}
              style={{
                width: "100%",
                border: BORDER,
                borderRadius: "0.5rem",
                background: PAPER,
                padding: "0.65rem 0.9rem",
                fontFamily: "monospace",
                fontSize: "0.82rem",
                color: INK,
                outline: "none",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
            <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={loading || !csv.trim()}
                style={{
                  borderRadius: "999px",
                  background: loading || !csv.trim() ? "rgba(26,22,19,0.15)" : INK,
                  color: PAPER,
                  border: "none",
                  padding: "0.55rem 1.25rem",
                  fontSize: "0.85rem",
                  cursor: loading || !csv.trim() ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-pt), serif",
                  transition: "background 0.2s ease",
                }}
              >
                {loading ? "Uploading…" : "Upload"}
              </button>
              <label
                style={{
                  borderRadius: "999px",
                  border: BORDER,
                  padding: "0.55rem 1.25rem",
                  fontSize: "0.85rem",
                  color: MUTED,
                  cursor: "pointer",
                  fontFamily: "var(--font-pt), serif",
                }}
              >
                Choose file
                <input type="file" accept=".csv,.txt" onChange={onFileChange} style={{ display: "none" }} />
              </label>
              {status && <p style={{ fontSize: "0.85rem", color: "var(--ink-mid)" }}>{status}</p>}
            </div>
          </form>
        </section>

        {/* Summary */}
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: MUTED, marginBottom: "0.75rem" }}>
          <span>{groups.length} invited groups</span>
          <span>{groups.filter((g) => g.claimedByEmail).length} verified</span>
          <span>{attendingCount} attending</span>
        </div>

        {/* Bulk bar */}
        {someSelected && (
          <div
            style={{
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              border: BORDER,
              borderRadius: "0.5rem",
              padding: "0.6rem 1rem",
              fontSize: "0.85rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: INK }}>{selected.size} selected</span>
            <button
              onClick={() => bulkAction("PATCH")}
              disabled={bulkLoading}
              style={{ borderRadius: "999px", border: BORDER, padding: "0.4rem 1rem", color: INK, background: "none", fontSize: "0.82rem", cursor: "pointer", fontFamily: "var(--font-pt), serif" }}
            >
              {bulkLoading ? "…" : "Unclaim selected"}
            </button>
            <button
              onClick={() => bulkAction("DELETE")}
              disabled={bulkLoading}
              style={{ borderRadius: "999px", border: `1px solid rgba(193,18,31,0.3)`, padding: "0.4rem 1rem", color: STAR, background: "none", fontSize: "0.82rem", cursor: "pointer", fontFamily: "var(--font-pt), serif" }}
            >
              {bulkLoading ? "…" : "Delete selected"}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              style={{ marginLeft: "auto", background: "none", border: "none", fontSize: "0.82rem", color: MUTED, cursor: "pointer" }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Table */}
        <section style={{ overflowX: "auto", borderRadius: "0.75rem", border: BORDER }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead style={{ background: "#f5f3ef" }}>
              <tr>
                <Th>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ accentColor: STAR }} />
                </Th>
                <Th>Invited</Th>
                <Th>Phones</Th>
                <Th>Max</Th>
                <Th>Claimed by</Th>
                <Th>RSVP</Th>
                <Th>Attendees</Th>
                <Th>Hotel</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr
                  key={g.id}
                  style={{
                    borderTop: BORDER,
                    verticalAlign: "top",
                    background: selected.has(g.id) ? "rgba(193,18,31,0.03)" : "transparent",
                  }}
                >
                  <Td>
                    <input type="checkbox" checked={selected.has(g.id)} onChange={() => toggleRow(g.id)} style={{ accentColor: STAR }} />
                  </Td>
                  <Td>{g.invitedNames.join(", ")}</Td>
                  <Td style={{ fontFamily: "monospace", fontSize: "0.78rem", color: MUTED }}>
                    {g.phones.map((p) => <div key={p}>{formatPhone(p)}</div>)}
                  </Td>
                  <Td>{g.maxPartySize}</Td>
                  <Td style={{ fontSize: "0.78rem", color: MUTED }}>
                    {g.claimedByEmail ? (
                      <>
                        <div>{g.claimedByEmail}</div>
                        {g.claimedByPhone && <div style={{ fontFamily: "monospace" }}>{formatPhone(g.claimedByPhone)}</div>}
                      </>
                    ) : "—"}
                  </Td>
                  <Td>{g.attending == null ? "—" : g.attending ? "Yes" : "No"}</Td>
                  <Td style={{ fontSize: "0.78rem" }}>
                    {g.partyMembers.length > 0
                      ? g.partyMembers.join(", ")
                      : g.partySize != null ? g.partySize : "—"}
                  </Td>
                  <Td>{g.attending ? (g.needsHotel ? "Needs hotel" : "Local") : "—"}</Td>
                  <Td>
                    <RowActions groupId={g.id} onDone={load} />
                  </Td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: MUTED }}>
                    No groups yet. Upload some above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function Th({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th style={{ padding: "0.65rem 1rem", color: "var(--ink-muted)", fontWeight: 500, fontSize: "0.78rem", letterSpacing: "0.04em", whiteSpace: "nowrap", ...style }}>
      {children}
    </th>
  );
}

function Td({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: "0.65rem 1rem", ...style }}>
      {children}
    </td>
  );
}

function RowActions({ groupId, onDone }: { groupId: number; onDone: () => void }) {
  const [confirm, setConfirm] = useState<"delete" | "unclaim" | null>(null);
  const [loading, setLoading] = useState(false);

  async function act(method: "DELETE" | "PATCH") {
    setLoading(true);
    try {
      await fetch(`/api/admin/guests/${groupId}`, { method });
      onDone();
    } finally {
      setLoading(false);
      setConfirm(null);
    }
  }

  if (confirm) {
    return (
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <button
          onClick={() => act(confirm === "delete" ? "DELETE" : "PATCH")}
          disabled={loading}
          style={{
            background: "none", border: "none", fontSize: "0.78rem", cursor: "pointer",
            color: confirm === "delete" ? STAR : "var(--ink-mid)", fontFamily: "var(--font-pt), serif", fontWeight: 600,
          }}
        >
          {loading ? "…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirm(null)}
          style={{ background: "none", border: "none", fontSize: "0.78rem", cursor: "pointer", color: MUTED, fontFamily: "var(--font-pt), serif" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "0.25rem" }}>
      <button
        onClick={() => setConfirm("unclaim")}
        style={{ background: "none", border: "none", fontSize: "0.78rem", cursor: "pointer", color: MUTED, fontFamily: "var(--font-pt), serif", padding: "0.2rem 0.4rem" }}
      >
        Unclaim
      </button>
      <button
        onClick={() => setConfirm("delete")}
        style={{ background: "none", border: "none", fontSize: "0.78rem", cursor: "pointer", color: MUTED, fontFamily: "var(--font-pt), serif", padding: "0.2rem 0.4rem" }}
      >
        Delete
      </button>
    </div>
  );
}
