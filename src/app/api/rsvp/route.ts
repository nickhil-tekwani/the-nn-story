import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, rsvps } from "@/db";
import { getClaimedGuest, getRsvp } from "@/lib/guest";

export async function GET() {
  const session = await auth();
  const guest = await getClaimedGuest(session?.user?.email);
  if (!guest) {
    return NextResponse.json(
      { error: "You haven't verified an invite yet." },
      { status: 403 },
    );
  }
  const rsvp = await getRsvp(guest.id);
  return NextResponse.json({
    guest: { name: guest.name, maxPartySize: guest.maxPartySize },
    rsvp,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const guest = await getClaimedGuest(session?.user?.email);
  if (!guest) {
    return NextResponse.json(
      { error: "You haven't verified an invite yet." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const attending = Boolean(body?.attending);
  const needsHotel = Boolean(body?.needsHotel);
  const partySize = Number(body?.partySize);

  if (attending) {
    if (!Number.isInteger(partySize) || partySize < 1) {
      return NextResponse.json(
        { error: "Party size must be at least 1." },
        { status: 400 },
      );
    }
    // Enforce the per-household cap set by the admin.
    if (partySize > guest.maxPartySize) {
      return NextResponse.json(
        {
          error: `Your party can include at most ${guest.maxPartySize} ${
            guest.maxPartySize === 1 ? "person" : "people"
          }. Reach out to the hosts if that's not right.`,
        },
        { status: 400 },
      );
    }
  }

  // Not attending → store party size of 0 and no hotel.
  const values = {
    guestId: guest.id,
    attending,
    needsHotel: attending ? needsHotel : false,
    partySize: attending ? partySize : 0,
    updatedAt: new Date(),
  };

  await db
    .insert(rsvps)
    .values(values)
    .onConflictDoUpdate({
      target: rsvps.guestId,
      set: {
        attending: values.attending,
        needsHotel: values.needsHotel,
        partySize: values.partySize,
        updatedAt: values.updatedAt,
      },
    });

  return NextResponse.json({ ok: true });
}
