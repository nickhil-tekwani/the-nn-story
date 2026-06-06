import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, guests, rsvps } from "@/db";
import { isAdminEmail } from "@/lib/admin";
import { normalizePhone, isValidUsPhone } from "@/lib/phone";

async function requireAdmin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return null;
  return session;
}

/** List every guest with their claim + RSVP status. */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const rows = await db
    .select({
      id: guests.id,
      name: guests.name,
      phone: guests.phone,
      maxPartySize: guests.maxPartySize,
      claimedByEmail: guests.claimedByEmail,
      attending: rsvps.attending,
      needsHotel: rsvps.needsHotel,
      partySize: rsvps.partySize,
    })
    .from(guests)
    .leftJoin(rsvps, eq(rsvps.guestId, guests.id))
    .orderBy(guests.name);

  return NextResponse.json({ guests: rows });
}

/**
 * Bulk add/update guests from pasted CSV. Columns (header optional):
 *   name, phone, max_party_size
 * Existing rows (matched by normalized phone) have their name and cap updated;
 * claim status is preserved.
 */
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const csv: string = body?.csv ?? "";
  const parsed = parseCsv(csv);

  const valid: { name: string; phone: string; maxPartySize: number }[] = [];
  const errors: string[] = [];

  parsed.forEach((cols, i) => {
    const lineNo = i + 1;
    const name = (cols[0] ?? "").trim();
    const rawPhone = (cols[1] ?? "").trim();
    const max = parseInt((cols[2] ?? "1").trim(), 10);

    if (!name) {
      errors.push(`Line ${lineNo}: missing name.`);
      return;
    }
    if (!isValidUsPhone(rawPhone)) {
      errors.push(`Line ${lineNo} (${name}): invalid phone "${rawPhone}".`);
      return;
    }
    valid.push({
      name,
      phone: normalizePhone(rawPhone),
      maxPartySize: Number.isInteger(max) && max > 0 ? max : 1,
    });
  });

  let inserted = 0;
  for (const g of valid) {
    await db
      .insert(guests)
      .values(g)
      .onConflictDoUpdate({
        target: guests.phone,
        set: { name: g.name, maxPartySize: g.maxPartySize },
      });
    inserted++;
  }

  return NextResponse.json({ ok: true, processed: inserted, errors });
}

/** Minimal CSV parser: handles double-quoted fields and skips a header row. */
function parseCsv(text: string): string[][] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = lines.map(splitCsvLine);
  if (rows.length === 0) return rows;

  // Drop a header row if the first cell isn't a phone-ish value.
  const first = rows[0].map((c) => c.toLowerCase());
  if (first.some((c) => c.includes("name") || c.includes("phone"))) {
    return rows.slice(1);
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
