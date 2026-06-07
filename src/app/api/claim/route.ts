import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db, guests } from "@/db";
import { normalizePhone } from "@/lib/phone";

/**
 * Claim an invite by phone number. Binds the signed-in Google account to a
 * matching, unclaimed row on the guest list.
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // If this account already claimed an invite, treat it as success (idempotent).
  const [existing] = await db
    .select()
    .from(guests)
    .where(eq(guests.claimedByEmail, email))
    .limit(1);
  if (existing) {
    return NextResponse.json({ ok: true, guest: { name: existing.name } });
  }

  const body = await req.json().catch(() => null);
  const rawPhone: string = body?.phone ?? "";
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return NextResponse.json(
      { error: "Please enter a valid US (+1) or India (+91) phone number." },
      { status: 400 },
    );
  }

  // Only claim a row that matches the phone AND is still unclaimed. Doing the
  // claimed-check inside the UPDATE avoids a race between two simultaneous logins.
  const claimed = await db
    .update(guests)
    .set({ claimedByEmail: email, claimedAt: new Date() })
    .where(and(eq(guests.phone, phone), isNull(guests.claimedByEmail)))
    .returning({ name: guests.name });

  if (claimed.length > 0) {
    return NextResponse.json({ ok: true, guest: { name: claimed[0].name } });
  }

  // Nothing was claimed: figure out why (not on list vs. already claimed).
  const [match] = await db
    .select({ claimedByEmail: guests.claimedByEmail })
    .from(guests)
    .where(eq(guests.phone, phone))
    .limit(1);

  if (!match) {
    return NextResponse.json(
      {
        error:
          "We couldn't find that number on the guest list. Double-check it, or reach out to the hosts.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { error: "That number has already been claimed by another account." },
    { status: 409 },
  );
}
