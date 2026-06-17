import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db, groups, groupPhones } from "@/db";
import { normalizePhone } from "@/lib/phone";
import { logEvent } from "@/lib/logEvent";

/** Last 4 digits of an E.164 number, for a friendly "ending in 4040" hint. */
function lastFour(e164: string | null): string {
  const digits = (e164 ?? "").replace(/\D/g, "");
  return digits.slice(-4);
}

/**
 * Claim an invite by phone number. Any phone number on a group's list can claim
 * the group; once claimed, the group is locked to one Google account, and other
 * members are pointed back to the claimer.
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // If this account already claimed a group, treat it as success (idempotent).
  const [already] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.claimedByEmail, email))
    .limit(1);
  if (already) {
    return NextResponse.json({ ok: true });
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

  // Find which group this number belongs to.
  const [match] = await db
    .select({ groupId: groupPhones.groupId })
    .from(groupPhones)
    .where(eq(groupPhones.phone, phone))
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

  // Atomically claim the group only if it's still unclaimed. Doing the
  // unclaimed-check inside the UPDATE avoids a race between two members.
  const claimed = await db
    .update(groups)
    .set({ claimedByEmail: email, claimedByPhone: phone, claimedAt: new Date() })
    .where(and(eq(groups.id, match.groupId), isNull(groups.claimedByEmail)))
    .returning({ id: groups.id });

  if (claimed.length > 0) {
    await logEvent("invite_claimed", { email, groupId: match.groupId });
    return NextResponse.json({ ok: true });
  }

  // Already claimed by someone else — point them to the claimer's number.
  const [g] = await db
    .select({ claimedByPhone: groups.claimedByPhone })
    .from(groups)
    .where(eq(groups.id, match.groupId))
    .limit(1);

  const hint = lastFour(g?.claimedByPhone ?? null);
  return NextResponse.json(
    {
      error: hint
        ? `This invite was already claimed by the number ending in ${hint}. Ask them to sign in to view or update the RSVP.`
        : "This invite has already been claimed by another member of your group.",
    },
    { status: 409 },
  );
}
