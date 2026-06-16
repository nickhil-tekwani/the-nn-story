import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, rsvps } from "@/db";
import { getClaimedGroup, getRsvp } from "@/lib/guest";
import type { DietaryInfo } from "@/db/schema";

export async function GET() {
  const session = await auth();
  const group = await getClaimedGroup(session?.user?.email);
  if (!group) {
    return NextResponse.json(
      { error: "You haven't verified an invite yet." },
      { status: 403 },
    );
  }
  const rsvp = await getRsvp(group.id);
  return NextResponse.json({
    group: { maxPartySize: group.maxPartySize },
    rsvp,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const group = await getClaimedGroup(session?.user?.email);
  if (!group) {
    return NextResponse.json(
      { error: "You haven't verified an invite yet." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const attending = Boolean(body?.attending);
  const needsHotel = Boolean(body?.needsHotel);
  const partySize = Number(body?.partySize);
  const rawMembers: unknown = body?.partyMembers;
  const rawDietary: unknown = body?.dietaryRestrictions;

  let partyMembers: string[] = [];
  let dietaryRestrictions: DietaryInfo[] = [];

  if (attending) {
    if (!Number.isInteger(partySize) || partySize < 1) {
      return NextResponse.json(
        { error: "Party size must be at least 1." },
        { status: 400 },
      );
    }
    // Enforce the per-group cap set by the admin.
    if (partySize > group.maxPartySize) {
      return NextResponse.json(
        {
          error: `Your party can include at most ${group.maxPartySize} ${
            group.maxPartySize === 1 ? "person" : "people"
          }. Reach out to the hosts if that's not right.`,
        },
        { status: 400 },
      );
    }

    // Collect and validate the attendee names.
    partyMembers = Array.isArray(rawMembers)
      ? rawMembers.map((m) => String(m ?? "").trim())
      : [];

    if (partyMembers.length !== partySize || partyMembers.some((n) => !n)) {
      return NextResponse.json(
        {
          error: `Please enter a name for all ${partySize} ${
            partySize === 1 ? "guest" : "guests"
          } in your party.`,
        },
        { status: 400 },
      );
    }

    // Build dietary restrictions, one entry per party member.
    const rawArr = Array.isArray(rawDietary) ? rawDietary : [];
    dietaryRestrictions = partyMembers.map((_, i) => {
      const d = rawArr[i] ?? {};
      return {
        chicken: Boolean(d.chicken),
        turkey:  Boolean(d.turkey),
        beef:    Boolean(d.beef),
        pork:    Boolean(d.pork),
        fish:    Boolean(d.fish),
        egg:     Boolean(d.egg),
        allergies: String(d.allergies ?? "").trim(),
      };
    });
  }

  // Not attending → store party size of 0, no hotel, no names.
  const values = {
    groupId: group.id,
    attending,
    needsHotel: attending ? needsHotel : false,
    partySize: attending ? partySize : 0,
    partyMembers: attending ? partyMembers : [],
    dietaryRestrictions: attending ? dietaryRestrictions : [],
    updatedAt: new Date(),
  };

  await db
    .insert(rsvps)
    .values(values)
    .onConflictDoUpdate({
      target: rsvps.groupId,
      set: {
        attending: values.attending,
        needsHotel: values.needsHotel,
        partySize: values.partySize,
        partyMembers: values.partyMembers,
        dietaryRestrictions: values.dietaryRestrictions,
        updatedAt: values.updatedAt,
      },
    });

  return NextResponse.json({ ok: true });
}
