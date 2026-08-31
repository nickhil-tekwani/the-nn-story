import { eq } from "drizzle-orm";
import { db, groups, rsvps, type DietaryInfo, type Group } from "@/db";

type RsvpGroup = Pick<Group, "id" | "maxPartySize">;

export type SavedRsvpSummary = {
  attending: boolean;
  needsHotel: boolean;
  partySize: number;
};

export type AnalyticsRsvpSnapshot = {
  attending: boolean;
  partySize: number;
  locality: "local" | "out_of_town" | "not_attending";
};

export type SaveRsvpResult =
  | {
      ok: true;
      summary: SavedRsvpSummary;
      analytics: {
        action: "first_response" | "update";
        before: AnalyticsRsvpSnapshot | null;
        after: AnalyticsRsvpSnapshot;
      };
    }
  | { ok: false; status: 400; error: string };

/**
 * Validate and persist an RSVP for a group. Guest and admin routes both call
 * this function so they always enforce the same rules and write the same row.
 */
export async function saveRsvpSubmission(
  group: RsvpGroup,
  body: unknown,
): Promise<SaveRsvpResult> {
  const [previousRsvp] = await db
    .select()
    .from(rsvps)
    .where(eq(rsvps.groupId, group.id))
    .limit(1);
  const data = body && typeof body === "object"
    ? body as Record<string, unknown>
    : {};
  const attending = Boolean(data.attending);
  const needsHotel = Boolean(data.needsHotel);
  const hometown = !attending
    ? null
    : needsHotel
      ? (String(data.hometown ?? "").trim() || null)
      : "Cincinnati, OH";
  const partySize = Number(data.partySize);
  const rawMembers = data.partyMembers;
  const rawDietary = data.dietaryRestrictions;

  let partyMembers: string[] = [];
  let dietaryRestrictions: DietaryInfo[] = [];

  if (attending) {
    if (!Number.isInteger(partySize) || partySize < 1) {
      return { ok: false, status: 400, error: "Party size must be at least 1." };
    }
    if (partySize > group.maxPartySize) {
      return {
        ok: false,
        status: 400,
        error: `This party can include at most ${group.maxPartySize} ${
          group.maxPartySize === 1 ? "person" : "people"
        }.`,
      };
    }

    partyMembers = Array.isArray(rawMembers)
      ? rawMembers.map((member) => String(member ?? "").trim())
      : [];
    if (partyMembers.length !== partySize || partyMembers.some((name) => !name)) {
      return {
        ok: false,
        status: 400,
        error: `Please enter a name for all ${partySize} ${
          partySize === 1 ? "guest" : "guests"
        } in the party.`,
      };
    }

    const rawDietaryArray = Array.isArray(rawDietary) ? rawDietary : [];
    dietaryRestrictions = partyMembers.map((_, index) => {
      const dietary = rawDietaryArray[index] && typeof rawDietaryArray[index] === "object"
        ? rawDietaryArray[index] as Record<string, unknown>
        : {};
      return {
        chicken: Boolean(dietary.chicken),
        turkey: Boolean(dietary.turkey),
        beef: Boolean(dietary.beef),
        pork: Boolean(dietary.pork),
        fish: Boolean(dietary.fish),
        egg: Boolean(dietary.egg),
        allergies: String(dietary.allergies ?? "").trim(),
      };
    });
  }

  const values = {
    groupId: group.id,
    attending,
    needsHotel: attending ? needsHotel : false,
    hometown,
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
        hometown: values.hometown,
        partySize: values.partySize,
        partyMembers: values.partyMembers,
        dietaryRestrictions: values.dietaryRestrictions,
        updatedAt: values.updatedAt,
      },
    });

  // Keep attendee-name edits consistent with the existing guest RSVP flow.
  if (Array.isArray(data.invitedNames)) {
    const updatedNames = data.invitedNames
      .map((name) => String(name ?? "").trim())
      .filter(Boolean);
    if (updatedNames.length > 0) {
      await db
        .update(groups)
        .set({ invitedNames: updatedNames })
        .where(eq(groups.id, group.id));
    }
  }

  return {
    ok: true,
    summary: {
      attending: values.attending,
      needsHotel: values.needsHotel,
      partySize: values.partySize,
    },
    analytics: {
      action: previousRsvp ? "update" : "first_response",
      before: previousRsvp
        ? {
            attending: previousRsvp.attending,
            partySize: previousRsvp.attending ? previousRsvp.partySize : 0,
            locality: !previousRsvp.attending
              ? "not_attending"
              : previousRsvp.needsHotel
                ? "out_of_town"
                : "local",
          }
        : null,
      after: {
        attending: values.attending,
        partySize: values.partySize,
        locality: !values.attending
          ? "not_attending"
          : values.needsHotel
            ? "out_of_town"
            : "local",
      },
    },
  };
}
