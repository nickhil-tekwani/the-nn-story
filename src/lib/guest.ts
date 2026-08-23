import { eq } from "drizzle-orm";
import { db, groupMembers, groups, rsvps, type Group, type Rsvp } from "@/db";

/** The group connected to a given Google email, or null if none is connected. */
export async function getClaimedGroup(
  email?: string | null,
): Promise<Group | null> {
  if (!email) return null;
  const [row] = await db
    .select({ group: groups })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.email, email.toLowerCase()))
    .limit(1);
  return row?.group ?? null;
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
