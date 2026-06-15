import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db, groups, groupPhones, rsvps } from "@/db";
import { isAdminEmail } from "@/lib/admin";
import { normalizePhone } from "@/lib/phone";

async function requireAdmin() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return null;
  return session;
}

/** List every group with its phones, claim status and RSVP. */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const groupRows = await db.select().from(groups).orderBy(groups.id);
  const phoneRows = await db.select().from(groupPhones);
  const rsvpRows = await db.select().from(rsvps);

  const phonesByGroup = new Map<number, string[]>();
  for (const p of phoneRows) {
    const list = phonesByGroup.get(p.groupId) ?? [];
    list.push(p.phone);
    phonesByGroup.set(p.groupId, list);
  }
  const rsvpByGroup = new Map<number, (typeof rsvpRows)[number]>();
  for (const r of rsvpRows) rsvpByGroup.set(r.groupId, r);

  const result = groupRows.map((g) => {
    const r = rsvpByGroup.get(g.id);
    return {
      id: g.id,
      invitedNames: g.invitedNames,
      phones: phonesByGroup.get(g.id) ?? [],
      maxPartySize: g.maxPartySize,
      claimedByEmail: g.claimedByEmail,
      claimedByPhone: g.claimedByPhone,
      attending: r?.attending ?? null,
      needsHotel: r?.needsHotel ?? null,
      partySize: r?.partySize ?? null,
      partyMembers: r?.partyMembers ?? [],
    };
  });

  return NextResponse.json({ groups: result });
}

/**
 * Bulk add/update invited groups from pasted CSV. Two columns per row:
 *   names, phones
 * where each cell is a list separated by ';' or '|'. For example:
 *   "Nick Tekwani; Nikki; Mom; Dad; Sis", "+1 513 555 0142; +91 98765 43210"
 *
 * The number of names sets the group's max party size. Phones are normalized to
 * E.164. Groups are matched to existing ones by any shared phone number, so
 * re-uploading updates the names/cap and adds new phones without dropping claims
 * or RSVPs.
 */
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const csv: string = body?.csv ?? "";
  const rows = parseCsv(csv);

  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const lineNo = i + 1;
    const cols = rows[i];
    const names = splitList(cols[0] ?? "");
    const rawPhones = splitList(cols[1] ?? "");

    if (names.length === 0) {
      errors.push(`Line ${lineNo}: no names listed.`);
      continue;
    }

    const phones: string[] = [];
    for (const raw of rawPhones) {
      const p = normalizePhone(raw);
      if (!p) {
        errors.push(`Line ${lineNo} (${names[0]}): invalid phone "${raw}".`);
        continue;
      }
      if (!phones.includes(p)) phones.push(p);
    }

    if (phones.length === 0) {
      errors.push(`Line ${lineNo} (${names[0]}): no valid phone numbers.`);
      continue;
    }

    // Which existing groups already own any of these phones?
    const existing = await db
      .select({ groupId: groupPhones.groupId, phone: groupPhones.phone })
      .from(groupPhones)
      .where(inArray(groupPhones.phone, phones));

    const existingGroupIds = [...new Set(existing.map((e) => e.groupId))];

    if (existingGroupIds.length > 1) {
      errors.push(
        `Line ${lineNo} (${names[0]}): phones already span multiple groups — resolve manually.`,
      );
      continue;
    }

    const maxPartySize = names.length;

    if (existingGroupIds.length === 1) {
      // Update the existing group and add any new phones.
      const groupId = existingGroupIds[0];
      await db
        .update(groups)
        .set({ invitedNames: names, maxPartySize })
        .where(eq(groups.id, groupId));

      const have = new Set(existing.map((e) => e.phone));
      const toAdd = phones.filter((p) => !have.has(p));
      if (toAdd.length > 0) {
        await db
          .insert(groupPhones)
          .values(toAdd.map((phone) => ({ groupId, phone })));
      }
      updated++;
    } else {
      // Brand-new group.
      const [g] = await db
        .insert(groups)
        .values({ invitedNames: names, maxPartySize })
        .returning({ id: groups.id });
      await db
        .insert(groupPhones)
        .values(phones.map((phone) => ({ groupId: g.id, phone })));
      created++;
    }
  }

  return NextResponse.json({ ok: true, created, updated, errors });
}

/** Split a CSV cell list on ';' or '|' into trimmed, non-empty values. */
function splitList(cell: string): string[] {
  return cell
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Minimal CSV parser: handles double-quoted fields and skips a header row. */
function parseCsv(text: string): string[][] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = lines.map(splitCsvLine);
  if (rows.length === 0) return rows;

  // Drop a header row if the first cell looks like a column label.
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
