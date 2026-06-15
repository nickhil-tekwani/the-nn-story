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
      await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/admin/guests/${id}`, { method }),
        ),
      );
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
    <main className="min-h-screen bg-stone-900 px-6 py-10 font-sans text-stone-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Guest Admin</h1>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="underline">View site</Link>
            <SignOutButton />
          </div>
        </header>

        {/* Upload */}
        <section className="mb-10 rounded-xl border border-stone-700 bg-stone-800 p-6">
          <h2 className="mb-2 text-lg font-medium">Add / update groups</h2>
          <p className="mb-4 text-sm text-stone-400">
            Paste CSV rows with two columns: <code>names, phones</code>. Each cell
            is a list separated by <code>;</code> or <code>|</code>. The number of
            names sets the group&apos;s max party size. Any phone on a group&apos;s
            list can claim the invite. Re-uploading matches existing groups by a
            shared phone (claims &amp; RSVPs are preserved). Phones are normalized
            — bare 10-digit numbers are treated as US (+1); prefix India numbers
            with <code>+91</code>.
          </p>
          <form onSubmit={upload}>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={6}
              placeholder={
                '"Nick Tekwani; Nikki; Mom; Dad; Sis", "+1 513 555 0142; +1 513 555 0143"\n"Alex Doe", "513-555-0199"\n"Priya Sharma; Raj Sharma", "+91 98765 43210"'
              }
              className="w-full rounded-lg border border-stone-600 bg-stone-900 p-3 font-mono text-sm text-stone-100 focus:border-stone-400 focus:outline-none"
            />
            <div className="mt-3 flex items-center gap-4">
              <button
                type="submit"
                disabled={loading || !csv.trim()}
                className="rounded-full bg-amber-400 px-5 py-2 text-sm font-medium text-stone-900 transition hover:bg-amber-300 disabled:opacity-50"
              >
                {loading ? "Uploading…" : "Upload"}
              </button>
              <label className="cursor-pointer rounded-full border border-stone-600 px-5 py-2 text-sm font-medium text-stone-300 transition hover:border-stone-400 hover:text-stone-100">
                Choose file
                <input type="file" accept=".csv,.txt" onChange={onFileChange} className="sr-only" />
              </label>
              {status && <p className="text-sm text-stone-300">{status}</p>}
            </div>
          </form>
        </section>

        {/* Summary */}
        <div className="mb-4 flex gap-6 text-sm text-stone-400">
          <span>{groups.length} invited groups</span>
          <span>{groups.filter((g) => g.claimedByEmail).length} verified</span>
          <span>{attendingCount} attending (incl. guests)</span>
        </div>

        {/* Bulk action bar */}
        {someSelected && (
          <div className="mb-3 flex items-center gap-4 rounded-lg border border-stone-600 bg-stone-800 px-4 py-2.5 text-sm">
            <span className="text-stone-300">{selected.size} selected</span>
            <button
              onClick={() => bulkAction("PATCH")}
              disabled={bulkLoading}
              className="rounded-full border border-stone-500 px-4 py-1.5 text-stone-300 transition hover:border-stone-300 hover:text-white disabled:opacity-50"
            >
              {bulkLoading ? "…" : "Unclaim selected"}
            </button>
            <button
              onClick={() => bulkAction("DELETE")}
              disabled={bulkLoading}
              className="rounded-full border border-rose-800 px-4 py-1.5 text-rose-400 transition hover:border-rose-500 hover:text-rose-300 disabled:opacity-50"
            >
              {bulkLoading ? "…" : "Delete selected"}
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-stone-500 hover:text-stone-300"
            >
              Clear
            </button>
          </div>
        )}

        {/* Table */}
        <section className="overflow-x-auto rounded-xl border border-stone-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-800 text-stone-400">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-amber-400"
                  />
                </th>
                <th className="px-4 py-3">Invited</th>
                <th className="px-4 py-3">Phones</th>
                <th className="px-4 py-3">Max</th>
                <th className="px-4 py-3">Claimed by</th>
                <th className="px-4 py-3">RSVP</th>
                <th className="px-4 py-3">Attendees</th>
                <th className="px-4 py-3">Hotel</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr
                  key={g.id}
                  className={`border-t border-stone-800 align-top ${selected.has(g.id) ? "bg-stone-800/50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(g.id)}
                      onChange={() => toggleRow(g.id)}
                      className="accent-amber-400"
                    />
                  </td>
                  <td className="px-4 py-3">{g.invitedNames.join(", ")}</td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-400">
                    {g.phones.map((p) => (
                      <div key={p}>{formatPhone(p)}</div>
                    ))}
                  </td>
                  <td className="px-4 py-3">{g.maxPartySize}</td>
                  <td className="px-4 py-3 text-xs text-stone-400">
                    {g.claimedByEmail ? (
                      <>
                        <div>{g.claimedByEmail}</div>
                        {g.claimedByPhone && (
                          <div className="font-mono">{formatPhone(g.claimedByPhone)}</div>
                        )}
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {g.attending == null ? "—" : g.attending ? "Yes" : "No"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {g.partyMembers.length > 0
                      ? g.partyMembers.join(", ")
                      : g.partySize != null
                        ? g.partySize
                        : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {g.attending ? (g.needsHotel ? "Needs hotel" : "Local") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <RowActions groupId={g.id} onDone={load} />
                  </td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-stone-500">
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
      <div className="flex gap-2">
        <button
          onClick={() => act(confirm === "delete" ? "DELETE" : "PATCH")}
          disabled={loading}
          className={`rounded px-2 py-1 text-xs font-medium disabled:opacity-50 ${confirm === "delete" ? "text-rose-400 hover:text-rose-300" : "text-amber-400 hover:text-amber-300"}`}
        >
          {loading ? "…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirm(null)}
          className="rounded px-2 py-1 text-xs text-stone-500 hover:text-stone-300"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={() => setConfirm("unclaim")}
        className="rounded px-2 py-1 text-xs text-stone-600 transition hover:text-amber-400"
      >
        Unclaim
      </button>
      <button
        onClick={() => setConfirm("delete")}
        className="rounded px-2 py-1 text-xs text-stone-600 transition hover:text-rose-400"
      >
        Delete
      </button>
    </div>
  );
}
