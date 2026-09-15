import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import {
  db,
  groupLodgingPlans,
  groupMembers,
  groups,
  groupTravelLegs,
  hotels,
  rsvps,
  type GroupLabel,
  type LodgingType,
  type TimePeriod,
  type TravelDirection,
  type TravelMode,
} from "@/db";
import { AIRLINES, STAY_GROUP_LABELS } from "@/lib/stayConstants";

export { AIRLINES, STAY_GROUP_LABELS } from "@/lib/stayConstants";

const AIRLINE_CODES = new Set(AIRLINES.map(([code]) => code));
const TIME_PERIODS = new Set<TimePeriod>(["morning", "afternoon", "evening", "night"]);
const TRAVEL_MODES = new Set<TravelMode>(["flight", "bus", "drive", "other", "undecided"]);

export type StayEligibility = {
  groupId: number;
  groupLabel: GroupLabel;
  partySize: number;
  partyMembers: string[];
};

export function isStayEligibleRsvp(groupLabel: GroupLabel | null | undefined, rsvp: { attending: boolean; needsHotel: boolean } | null | undefined) {
  return Boolean(
    rsvp?.attending &&
    rsvp.needsHotel &&
    groupLabel &&
    STAY_GROUP_LABELS.includes(groupLabel as (typeof STAY_GROUP_LABELS)[number]),
  );
}

export async function getStayEligibility(email?: string | null): Promise<StayEligibility | null> {
  if (!email) return null;
  const [row] = await db
    .select({
      groupId: groups.id,
      groupLabel: groups.groupLabel,
      attending: rsvps.attending,
      outOfTown: rsvps.needsHotel,
      partySize: rsvps.partySize,
      partyMembers: rsvps.partyMembers,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .innerJoin(rsvps, eq(rsvps.groupId, groups.id))
    .where(eq(groupMembers.email, email.toLowerCase()))
    .limit(1);

  if (!row || !isStayEligibleRsvp(row.groupLabel, { attending: row.attending, needsHotel: row.outOfTown })) return null;

  return {
    groupId: row.groupId,
    groupLabel: row.groupLabel!,
    partySize: row.partySize,
    partyMembers: row.partyMembers,
  };
}

export async function getStayEligibilityForGroup(groupId: number): Promise<StayEligibility | null> {
  const [row] = await db.select({
    groupId: groups.id,
    groupLabel: groups.groupLabel,
    attending: rsvps.attending,
    outOfTown: rsvps.needsHotel,
    partySize: rsvps.partySize,
    partyMembers: rsvps.partyMembers,
  }).from(groups).innerJoin(rsvps, eq(rsvps.groupId, groups.id)).where(eq(groups.id, groupId)).limit(1);
  if (!row || !isStayEligibleRsvp(row.groupLabel, { attending: row.attending, needsHotel: row.outOfTown })) return null;
  return { groupId: row.groupId, groupLabel: row.groupLabel!, partySize: row.partySize, partyMembers: row.partyMembers };
}

export async function getAdminStayRows() {
  const [groupRows, lodgingRows, legRows, hotelRows] = await Promise.all([
    db.select({ id: groups.id, invitedNames: groups.invitedNames, groupLabel: groups.groupLabel, attending: rsvps.attending, outOfTown: rsvps.needsHotel, partySize: rsvps.partySize, partyMembers: rsvps.partyMembers })
      .from(groups).leftJoin(rsvps, eq(rsvps.groupId, groups.id)).orderBy(groups.id),
    db.select().from(groupLodgingPlans),
    db.select().from(groupTravelLegs),
    db.select().from(hotels).orderBy(asc(hotels.canonicalName)),
  ]);
  const lodgingByGroup = new Map(lodgingRows.map((row) => [row.groupId, row]));
  const legsByGroup = new Map<number, typeof legRows>();
  for (const leg of legRows) legsByGroup.set(leg.groupId, [...(legsByGroup.get(leg.groupId) ?? []), leg]);
  const hotelById = new Map(hotelRows.map((hotel) => [hotel.id, hotel]));
  const rows = groupRows.filter((group) => {
    const active = isStayEligibleRsvp(group.groupLabel, group.attending == null ? null : { attending: group.attending, needsHotel: Boolean(group.outOfTown) });
    return active || lodgingByGroup.has(group.id) || legsByGroup.has(group.id);
  }).map((group) => {
    const lodging = lodgingByGroup.get(group.id) ?? null;
    return {
      ...group,
      eligible: isStayEligibleRsvp(group.groupLabel, group.attending == null ? null : { attending: group.attending, needsHotel: Boolean(group.outOfTown) }),
      lodging,
      hotel: lodging?.hotelId ? hotelById.get(lodging.hotelId) ?? null : null,
      legs: legsByGroup.get(group.id) ?? [],
    };
  });
  return { rows, hotels: hotelRows };
}

export function normalizeHotelKey(name: string, locality: string, region: string) {
  return [name, locality, region]
    .join(" ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function guestDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts[0]} ${parts.at(-1)?.[0]?.toUpperCase()}.`;
}

export type LodgingValues = { lodgingType: LodgingType; hotelId: number | null; localArea: string | null; revision: number | null };

export function validateLodgingInput(body: unknown):
  | { ok: true; value: LodgingValues }
  | { ok: false; error: string } {
  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const lodgingType = String(data.lodgingType ?? "") as LodgingType;
  const revision = data.revision == null ? null : Number(data.revision);
  if (!["hotel", "friend_or_family", "undecided"].includes(lodgingType)) return { ok: false, error: "Choose where your group is staying." };
  if (revision != null && (!Number.isInteger(revision) || revision < 1)) return { ok: false, error: "Refresh the page and try again." };

  if (lodgingType === "hotel") {
    const hotelId = Number(data.hotelId);
    if (!Number.isInteger(hotelId) || hotelId < 1) return { ok: false, error: "Choose a hotel or add a new one." };
    return { ok: true, value: { lodgingType, hotelId, localArea: null, revision } };
  }
  if (lodgingType === "friend_or_family") {
    const localArea = String(data.localArea ?? "").trim();
    if (localArea.length < 2 || localArea.length > 100) return { ok: false, error: "Enter the town, suburb, or neighborhood only." };
    return { ok: true, value: { lodgingType, hotelId: null, localArea, revision } };
  }
  return { ok: true, value: { lodgingType, hotelId: null, localArea: null, revision } };
}

export type TravelLegValues = {
  direction: TravelDirection;
  mode: TravelMode;
  scheduledAt: Date | null;
  travelDate: string | null;
  timePeriod: TimePeriod | null;
  airlineCode: string | null;
  otherAirlineName: string | null;
  flightNumber: string | null;
  revision: number | null;
};

export function validateTravelLegInput(direction: TravelDirection, body: unknown):
  | { ok: true; value: TravelLegValues }
  | { ok: false; error: string } {
  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const mode = String(data.mode ?? "") as TravelMode;
  const revision = data.revision == null ? null : Number(data.revision);
  if (!TRAVEL_MODES.has(mode)) return { ok: false, error: "Choose a travel method." };
  if (revision != null && (!Number.isInteger(revision) || revision < 1)) return { ok: false, error: "Refresh the page and try again." };

  const base: TravelLegValues = {
    direction,
    mode,
    scheduledAt: null,
    travelDate: null,
    timePeriod: null,
    airlineCode: null,
    otherAirlineName: null,
    flightNumber: null,
    revision,
  };

  if (mode === "undecided" || mode === "other") return { ok: true, value: base };
  if (mode === "drive") {
    const travelDate = String(data.travelDate ?? "");
    const timePeriod = String(data.timePeriod ?? "") as TimePeriod;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) return { ok: false, error: `Enter your ${direction} date.` };
    if (!TIME_PERIODS.has(timePeriod)) return { ok: false, error: "Choose a rough time of day." };
    return { ok: true, value: { ...base, travelDate, timePeriod } };
  }

  const localDateTime = String(data.localDateTime ?? "");
  const scheduledAt = cincinnatiLocalToUtc(localDateTime);
  if (!scheduledAt) return { ok: false, error: `Enter your ${direction} date and time.` };
  if (mode === "bus") return { ok: true, value: { ...base, scheduledAt } };

  const airlineCode = String(data.airlineCode ?? "").toUpperCase();
  const otherAirlineName = airlineCode === "OTHER" ? String(data.otherAirlineName ?? "").trim() : null;
  const flightNumber = String(data.flightNumber ?? "").trim() || null;
  if (!AIRLINE_CODES.has(airlineCode as (typeof AIRLINES)[number][0])) return { ok: false, error: "Choose an airline." };
  if (airlineCode === "OTHER" && (!otherAirlineName || otherAirlineName.length > 80)) return { ok: false, error: "Enter the airline name." };
  if (flightNumber && !/^\d{1,4}$/.test(flightNumber)) return { ok: false, error: "Flight number must be 1–4 digits without the airline code." };
  return { ok: true, value: { ...base, scheduledAt, airlineCode, otherAirlineName, flightNumber } };
}

/** Convert a Cincinnati wall-clock input into an absolute instant, regardless of the browser's timezone. */
export function cincinnatiLocalToUtc(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const intended = Date.UTC(y, mo - 1, d, h, mi);
  if (new Date(intended).getUTCFullYear() !== y || new Date(intended).getUTCMonth() !== mo - 1 || new Date(intended).getUTCDate() !== d) return null;
  let guess = intended;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
    const rendered = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    guess += intended - rendered;
  }
  const result = new Date(guess);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function toCincinnatiInput(value: Date | string | null) {
  if (!value) return "";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export async function getStayData(eligibility: StayEligibility) {
  const [lodging] = await db.select().from(groupLodgingPlans).where(eq(groupLodgingPlans.groupId, eligibility.groupId)).limit(1);
  const legs = await db.select().from(groupTravelLegs).where(eq(groupTravelLegs.groupId, eligibility.groupId));
  const hotelOptions = await db
    .select({ id: hotels.id, canonicalName: hotels.canonicalName, locality: hotels.locality, region: hotels.region })
    .from(hotels)
    .where(eq(hotels.isArchived, false))
    .orderBy(asc(hotels.canonicalName));

  let hotelMatches: string[] = [];
  if (lodging?.lodgingType === "hotel" && lodging.hotelId) {
    const matches = await db
      .select({ partyMembers: rsvps.partyMembers })
      .from(groupLodgingPlans)
      .innerJoin(groups, eq(groupLodgingPlans.groupId, groups.id))
      .innerJoin(rsvps, eq(rsvps.groupId, groups.id))
      .where(and(
        eq(groupLodgingPlans.hotelId, lodging.hotelId),
        ne(groupLodgingPlans.groupId, eligibility.groupId),
        eq(rsvps.attending, true),
        eq(rsvps.needsHotel, true),
        inArray(groups.groupLabel, [...STAY_GROUP_LABELS]),
      ));
    hotelMatches = [...new Set(matches.flatMap((match) => match.partyMembers).map(guestDisplayName).filter(Boolean))];
  }

  return {
    partySize: eligibility.partySize,
    partyMembers: eligibility.partyMembers,
    lodging: lodging ? { ...lodging } : null,
    legs: legs.map((leg) => ({ ...leg, localDateTime: toCincinnatiInput(leg.scheduledAt) })),
    hotels: hotelOptions,
    hotelMatches,
  };
}

export async function getAdminStayPreviewData() {
  const hotelOptions = await db
    .select({ id: hotels.id, canonicalName: hotels.canonicalName, locality: hotels.locality, region: hotels.region })
    .from(hotels)
    .where(eq(hotels.isArchived, false))
    .orderBy(asc(hotels.canonicalName));

  return {
    partySize: 1,
    partyMembers: ["Example guest"],
    lodging: null,
    legs: [],
    hotels: hotelOptions,
    hotelMatches: [],
  };
}

export async function createHotel(groupId: number, body: unknown) {
  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const canonicalName = String(data.canonicalName ?? "").trim().replace(/\s+/g, " ");
  const locality = String(data.locality ?? "").trim().replace(/\s+/g, " ");
  const region = String(data.region ?? "OH").trim().toUpperCase();
  if (canonicalName.length < 4 || canonicalName.length > 140) return { ok: false as const, status: 400, error: "Enter the hotel's exact full name." };
  if (locality.length < 2 || locality.length > 100) return { ok: false as const, status: 400, error: "Enter the hotel's city, suburb, or neighborhood." };
  if (!/^[A-Z]{2}$/.test(region)) return { ok: false as const, status: 400, error: "Enter a two-letter state abbreviation." };
  const normalizedKey = normalizeHotelKey(canonicalName, locality, region);

  const [inserted] = await db.insert(hotels).values({
    canonicalName, locality, region, normalizedKey, createdByGroupId: groupId,
  }).onConflictDoNothing({ target: hotels.normalizedKey }).returning({
    id: hotels.id, canonicalName: hotels.canonicalName, locality: hotels.locality, region: hotels.region,
  });
  if (inserted) return { ok: true as const, hotel: inserted, created: true };

  const [existing] = await db.select({
    id: hotels.id, canonicalName: hotels.canonicalName, locality: hotels.locality, region: hotels.region, isArchived: hotels.isArchived,
  }).from(hotels).where(eq(hotels.normalizedKey, normalizedKey)).limit(1);
  if (!existing || existing.isArchived) return { ok: false as const, status: 409, error: "That hotel is archived. Please contact Nickhil or Nikki." };
  return { ok: true as const, hotel: existing, created: false };
}

export async function saveLodging(groupId: number, input: LodgingValues) {
  if (input.hotelId) {
    const [hotel] = await db.select({ id: hotels.id }).from(hotels)
      .where(and(eq(hotels.id, input.hotelId), eq(hotels.isArchived, false))).limit(1);
    if (!hotel) return { ok: false as const, status: 400, error: "Choose an active hotel." };
  }

  const [existing] = await db.select({ revision: groupLodgingPlans.revision })
    .from(groupLodgingPlans).where(eq(groupLodgingPlans.groupId, groupId)).limit(1);
  const values = { lodgingType: input.lodgingType, hotelId: input.hotelId, localArea: input.localArea, updatedAt: new Date() };
  if (!existing) {
    if (input.revision != null) return { ok: false as const, status: 409, error: "This plan changed. Refresh and try again." };
    const [created] = await db.insert(groupLodgingPlans).values({ groupId, ...values }).onConflictDoNothing()
      .returning({ revision: groupLodgingPlans.revision });
    return created
      ? { ok: true as const, revision: created.revision, action: "first_response" as const }
      : { ok: false as const, status: 409, error: "This plan changed. Refresh and try again." };
  }
  if (input.revision !== existing.revision) return { ok: false as const, status: 409, error: "Someone else updated this plan. Refresh to see their changes." };
  const [updated] = await db.update(groupLodgingPlans).set({ ...values, revision: sql`${groupLodgingPlans.revision} + 1` })
    .where(and(eq(groupLodgingPlans.groupId, groupId), eq(groupLodgingPlans.revision, existing.revision)))
    .returning({ revision: groupLodgingPlans.revision });
  return updated
    ? { ok: true as const, revision: updated.revision, action: "update" as const }
    : { ok: false as const, status: 409, error: "Someone else updated this plan. Refresh to see their changes." };
}

export async function saveTravelLeg(groupId: number, input: TravelLegValues) {
  const [existing] = await db.select({ revision: groupTravelLegs.revision })
    .from(groupTravelLegs)
    .where(and(eq(groupTravelLegs.groupId, groupId), eq(groupTravelLegs.direction, input.direction)))
    .limit(1);
  const values = {
    mode: input.mode,
    scheduledAt: input.scheduledAt,
    travelDate: input.travelDate,
    timePeriod: input.timePeriod,
    airlineCode: input.airlineCode,
    otherAirlineName: input.otherAirlineName,
    flightNumber: input.flightNumber,
    updatedAt: new Date(),
  };
  if (!existing) {
    if (input.revision != null) return { ok: false as const, status: 409, error: "This plan changed. Refresh and try again." };
    const [created] = await db.insert(groupTravelLegs).values({ groupId, direction: input.direction, ...values })
      .onConflictDoNothing().returning({ revision: groupTravelLegs.revision });
    return created
      ? { ok: true as const, revision: created.revision, action: "first_response" as const }
      : { ok: false as const, status: 409, error: "This plan changed. Refresh and try again." };
  }
  if (input.revision !== existing.revision) return { ok: false as const, status: 409, error: "Someone else updated this plan. Refresh to see their changes." };
  const [updated] = await db.update(groupTravelLegs).set({ ...values, revision: sql`${groupTravelLegs.revision} + 1` })
    .where(and(
      eq(groupTravelLegs.groupId, groupId),
      eq(groupTravelLegs.direction, input.direction),
      eq(groupTravelLegs.revision, existing.revision),
    )).returning({ revision: groupTravelLegs.revision });
  return updated
    ? { ok: true as const, revision: updated.revision, action: "update" as const }
    : { ok: false as const, status: 409, error: "Someone else updated this plan. Refresh to see their changes." };
}
