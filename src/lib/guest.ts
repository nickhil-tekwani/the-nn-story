import { eq } from "drizzle-orm";
import { db, guests, rsvps, type Guest, type Rsvp } from "@/db";

/** The invite claimed by a given email, or null if none claimed yet. */
export async function getClaimedGuest(
  email?: string | null,
): Promise<Guest | null> {
  if (!email) return null;
  const [g] = await db
    .select()
    .from(guests)
    .where(eq(guests.claimedByEmail, email.toLowerCase()))
    .limit(1);
  return g ?? null;
}

/** The existing RSVP for a guest, or null. */
export async function getRsvp(guestId: number): Promise<Rsvp | null> {
  const [r] = await db
    .select()
    .from(rsvps)
    .where(eq(rsvps.guestId, guestId))
    .limit(1);
  return r ?? null;
}
