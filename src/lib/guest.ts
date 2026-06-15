import { eq } from "drizzle-orm";
import { db, groups, rsvps, type Group, type Rsvp } from "@/db";

/** The group claimed by a given email, or null if none claimed yet. */
export async function getClaimedGroup(
  email?: string | null,
): Promise<Group | null> {
  if (!email) return null;
  const [g] = await db
    .select()
    .from(groups)
    .where(eq(groups.claimedByEmail, email.toLowerCase()))
    .limit(1);
  return g ?? null;
}

/** The existing RSVP for a group, or null. */
export async function getRsvp(groupId: number): Promise<Rsvp | null> {
  const [r] = await db
    .select()
    .from(rsvps)
    .where(eq(rsvps.groupId, groupId))
    .limit(1);
  return r ?? null;
}
