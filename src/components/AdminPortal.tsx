"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/AuthButtons";
import { formatPhone } from "@/lib/phone";
import type { GroupLabel } from "@/db/schema";

type GroupRow = {
  id: number;
  invitedNames: string[];
  phones: string[];
  maxPartySize: number;
  groupLabel: GroupLabel | null;
  claimedByEmail: string | null;
  claimedByPhone: string | null;
  attending: boolean | null;
  needsHotel: boolean | null;
  partySize: number | null;
  partyMembers: string[];
};

const GROUP_COLORS: Record<GroupLabel, { bg: string; text: string }> = {
  "Core":               { bg: "#fef3c7", text: "#92400e" },
  "Nikki Fam Friends":  { bg: "#fce7f3", text: "#9d174d" },
  "Nikki Friends":      { bg: "#fff0f3", text: "#be123c" },
  "Nick Fam":           { bg: "#dbeafe", text: "#1e40af" },
  "Nick Friends":       { bg: "#eff6ff", text: "#1d4ed8" },
};

const BORDER = "1px solid rgba(26,22,19,0.12)";
const MUTED = "var(--ink-muted)";
const INK = "var(--ink-warm)";
const PAPER = "var(--paper)";
const STAR = "#c1121f";

type SortDir = "asc" | "desc";

const LAST = "￿"; // sorts after everything alphabetically — used for nulls in asc

function getSortValue(g: GroupRow, col: string): string | number {
  switch (col) {
    case "invited":   return g.invitedNames.join(", ").toLowerCase();
    case "group":     return g.groupLabel?.toLowerCase() ?? LAST;
    case "phones":    return g.phones.join(", ").toLowerCase();
    case "max":       return g.maxPartySize;
    case "claimed":   return g.claimedByEmail?.toLowerCase() ?? LAST;
    case "rsvp":      return g.attending == null ? LAST : g.attending ? "a" : "b";
    case "attendees": return g.partySize ?? -1;
    case "hotel":     return g.attending ? (g.needsHotel ? "a" : "b") : LAST;
    default:          return "";
  }
}

export default function AdminPortal() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [csv, setCsv] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/guests");
    if (res.ok) {
      const data = await res.json();
      setGroups(data.groups);
      setSelected(new Set());
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derived: sort then filter (no useMemo needed — admin table is small)
  const sortedGroups = sortCol == null ? groups : [...groups].sort((a, b) => {
    const av = getSortValue(a, sortCol);
    const bv = getSortValue(b, sortCol);
    const cmp = typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const q = search.trim().toLowerCase();
  const filteredGroups = q === "" ? sortedGroups : sortedGroups.filter((g) =>
    [
      g.invitedNames.join(" "),
      g.groupLabel ?? "",
      g.phones.join(" "),
      g.claimedByEmail ?? "",
      g.claimedByPhone ?? "",
      g.partyMembers.join(" "),
      g.attending == null ? "" : g.attending ? "yes" : "no",
    ].some((s) => s.toLowerCase().includes(q))
  );

  const allSelected = filteredGroups.length > 0 && filteredGroups.every((g) => selected.has(g.id));
  const someSelected = selected.size > 0;
  const attendingCount = groups
    .filter((g) => g.attending)
    .reduce((sum, g) => sum + (g.partySize ?? 0), 0);

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
    const ids = filteredGroups.map((g) => g.id);
    setSelected((prev) => {
      const allChecked = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allChecked) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
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

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

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
            Paste CSV rows with three columns: <code>names, phones, group</code>. Names and phones are lists separated
            by <code>;</code> or <code>|</code>. Group must be one of:{" "}
            <code>Core</code>, <code>Nikki Fam Friends</code>, <code>Nikki Friends</code>, <code>Nick Fam</code>,{" "}
            <code>Nick Friends</code>. The number of names sets the max party size. Re-uploading matches by shared phone
            (claims &amp; RSVPs preserved). Bare 10-digit numbers treated as US; prefix India with <code>+91</code>.
          </p>
          <form onSubmit={upload}>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={5}
              placeholder={`"Nick Tekwani; Nikki; Mom", "+1 513 555 0142; +1 513 555 0143", "Core"\n"Alex Doe", "513-555-0199", "Nick Friends"`}
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

        {/* Summary + Search */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: MUTED }}>
            <span>{groups.length} invited groups</span>
            <span>{groups.filter((g) => g.claimedByEmail).length} verified</span>
            <span>{attendingCount} attending</span>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              border: BORDER,
              borderRadius: "999px",
              background: PAPER,
              padding: "0.4rem 0.9rem",
              fontFamily: "var(--font-pt), serif",
              fontSize: "0.82rem",
              color: INK,
              outline: "none",
              minWidth: "14rem",
            }}
          />
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
                <Th sortKey="invited"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Invited</Th>
                <Th sortKey="group"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Group</Th>
                <Th sortKey="phones"    sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Phones</Th>
                <Th sortKey="max"       sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Max</Th>
                <Th sortKey="claimed"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Claimed by</Th>
                <Th sortKey="rsvp"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>RSVP</Th>
                <Th sortKey="attendees" sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Attendees</Th>
                <Th sortKey="hotel"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort}>Hotel</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((g) => (
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
                  <Td>
                    {g.groupLabel ? (
                      <span style={{
                        display: "inline-block",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        background: GROUP_COLORS[g.groupLabel].bg,
                        color: GROUP_COLORS[g.groupLabel].text,
                        whiteSpace: "nowrap",
                      }}>
                        {g.groupLabel}
                      </span>
                    ) : "—"}
                  </Td>
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
              {filteredGroups.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: "2rem", textAlign: "center", color: MUTED }}>
                    {groups.length === 0 ? "No groups yet. Upload some above." : "No results match your search."}
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

function Th({
  children,
  style,
  sortKey,
  sortCol,
  sortDir,
  onSort,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  sortKey?: string;
  sortCol?: string | null;
  sortDir?: SortDir;
  onSort?: (key: string) => void;
}) {
  const active = sortKey != null && sortCol === sortKey;
  return (
    <th
      onClick={sortKey ? () => onSort?.(sortKey) : undefined}
      style={{
        padding: "0.65rem 1rem",
        color: active ? INK : MUTED,
        fontWeight: 500,
        fontSize: "0.78rem",
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
        cursor: sortKey ? "pointer" : "default",
        userSelect: sortKey ? "none" : undefined,
        ...style,
      }}
    >
      {children}
      {sortKey && (
        <span style={{ marginLeft: "0.3rem", opacity: active ? 1 : 0.35, fontSize: "0.7rem" }}>
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      )}
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
