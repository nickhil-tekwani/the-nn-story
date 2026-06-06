"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/AuthButtons";

type GuestRow = {
  id: number;
  name: string;
  phone: string;
  maxPartySize: number;
  claimedByEmail: string | null;
  attending: boolean | null;
  needsHotel: boolean | null;
  partySize: number | null;
};

export default function AdminPortal() {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [csv, setCsv] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/guests");
    if (res.ok) {
      const data = await res.json();
      setGuests(data.guests);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      if (!res.ok) {
        setStatus(data.error || "Upload failed.");
        return;
      }
      const errs = (data.errors as string[]) ?? [];
      setStatus(
        `Processed ${data.processed} guest(s).` +
          (errs.length ? ` Skipped ${errs.length}: ${errs.join(" ")}` : ""),
      );
      setCsv("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  const attendingCount = guests
    .filter((g) => g.attending)
    .reduce((sum, g) => sum + (g.partySize ?? 0), 0);

  return (
    <main className="min-h-screen bg-stone-900 px-6 py-10 font-sans text-stone-100">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Guest Admin</h1>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="underline">
              View site
            </Link>
            <SignOutButton />
          </div>
        </header>

        {/* Upload */}
        <section className="mb-10 rounded-xl border border-stone-700 bg-stone-800 p-6">
          <h2 className="mb-2 text-lg font-medium">Add / update guests</h2>
          <p className="mb-4 text-sm text-stone-400">
            Paste CSV rows: <code>name, phone, max_party_size</code>. A header
            row is optional. Existing guests (matched by phone) are updated;
            claims are preserved.
          </p>
          <form onSubmit={upload}>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={6}
              placeholder={"Jane & John Smith, (513) 555-0142, 4\nAlex Doe, 513-555-0199, 2"}
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
              {status && <p className="text-sm text-stone-300">{status}</p>}
            </div>
          </form>
        </section>

        {/* Summary */}
        <div className="mb-4 flex gap-6 text-sm text-stone-400">
          <span>{guests.length} invited households</span>
          <span>{guests.filter((g) => g.claimedByEmail).length} verified</span>
          <span>{attendingCount} attending (incl. guests)</span>
        </div>

        {/* Table */}
        <section className="overflow-x-auto rounded-xl border border-stone-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-800 text-stone-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Max</th>
                <th className="px-4 py-3">Verified by</th>
                <th className="px-4 py-3">RSVP</th>
                <th className="px-4 py-3">Party</th>
                <th className="px-4 py-3">Hotel</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id} className="border-t border-stone-800">
                  <td className="px-4 py-3">{g.name}</td>
                  <td className="px-4 py-3 font-mono text-stone-400">
                    {formatPhone(g.phone)}
                  </td>
                  <td className="px-4 py-3">{g.maxPartySize}</td>
                  <td className="px-4 py-3 text-stone-400">
                    {g.claimedByEmail ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {g.attending == null
                      ? "—"
                      : g.attending
                        ? "Yes"
                        : "No"}
                  </td>
                  <td className="px-4 py-3">{g.partySize ?? "—"}</td>
                  <td className="px-4 py-3">
                    {g.attending ? (g.needsHotel ? "Needs hotel" : "Local") : "—"}
                  </td>
                </tr>
              ))}
              {guests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                    No guests yet. Upload some above.
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

function formatPhone(p: string): string {
  if (p.length === 10) {
    return `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}`;
  }
  return p;
}
