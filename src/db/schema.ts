import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export type DietaryInfo = {
  chicken: boolean;
  turkey: boolean;
  beef: boolean;
  pork: boolean;
  fish: boolean;
  egg: boolean;
  allergies: string;
};

/**
 * An invited group (household, friend group, or a single individual). One row
 * per invite.
 *  - `invitedNames` is the admin's reference list of who's in the group. Its
 *    length sets `maxPartySize` (the cap on the RSVP form). These names are NOT
 *    shown to guests — guests enter their own attendee names when they RSVP.
 *  - `maxPartySize` is the per-group cap. Defaults to the number of invited
 *    names but can be overridden by an admin.
 *  - A group can have many phone numbers (see `groupPhones`). ANY of them can
 *    connect a Google account to the invite, up to `maxPartySize` accounts.
 *  - `claimedByEmail`, `claimedByPhone`, and `claimedAt` retain the original
 *    primary claimant for rollout/rollback compatibility. Access is authorized
 *    through `groupMembers`, not these legacy columns.
 */
export const GROUP_LABELS = [
  "Core",
  "Nikki Fam Friends",
  "Nikki Friends",
  "Nick Fam",
  "Nick Friends",
] as const;
export type GroupLabel = (typeof GROUP_LABELS)[number];

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  invitedNames: text("invited_names").array().notNull().default([]),
  maxPartySize: integer("max_party_size").notNull().default(1),
  groupLabel: text("group_label").$type<GroupLabel>(),
  claimedByEmail: text("claimed_by_email"),
  claimedByPhone: text("claimed_by_phone"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * The phone numbers that belong to a group. `phone` is stored normalized
 * (E.164, e.g. "+15135550142") and is globally unique, so a number maps to
 * exactly one group and can't be re-used to claim another invite.
 */
export const groupPhones = pgTable(
  "group_phones",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    phone: text("phone").notNull(),
  },
  (t) => ({
    phoneIdx: uniqueIndex("group_phones_phone_idx").on(t.phone),
    groupIdx: index("group_phones_group_idx").on(t.groupId),
  }),
);

/**
 * Google accounts connected to invited groups. An email is globally unique, so
 * one Google account belongs to at most one group. `slot` is unique within the
 * group and is allocated from 1..maxPartySize; this makes the membership limit
 * safe even when multiple approved members claim concurrently.
 */
export const groupMembers = pgTable(
  "group_members",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    slot: integer("slot").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slotPositive: check("group_members_slot_positive", sql`${t.slot} > 0`),
    emailIdx: uniqueIndex("group_members_email_idx").on(t.email),
    slotIdx: uniqueIndex("group_members_group_slot_idx").on(t.groupId, t.slot),
    groupIdx: index("group_members_group_idx").on(t.groupId),
  }),
);

/**
 * One RSVP per group.
 *  - `partyMembers` is the list of attendee names entered by the claimer. Its
 *    length matches `partySize` when attending.
 */
export const rsvps = pgTable(
  "rsvps",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    attending: boolean("attending").notNull(),
    // Legacy name: true means out of town, false means local to Cincinnati.
    // Actual lodging choice lives in groupLodgingPlans.
    needsHotel: boolean("needs_hotel").notNull().default(false),
    partySize: integer("party_size").notNull(),
    partyMembers: text("party_members").array().notNull().default([]),
    dietaryRestrictions: jsonb("dietary_restrictions").$type<DietaryInfo[]>().notNull().default([]),
    hometown: text("hometown"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    groupIdx: uniqueIndex("rsvps_group_idx").on(t.groupId),
  }),
);

/**
 * Server-side audit log. One row per meaningful action.
 * `email` is the Google account from the session; `groupId` links to the
 * relevant guest group so events can be joined to guest data.
 */
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  event: text("event").notNull(),
  email: text("email"),
  groupId: integer("group_id").references(() => groups.id, { onDelete: "set null" }),
  properties: jsonb("properties").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  eventCreatedIdx: index("events_event_created_idx").on(t.event, t.createdAt),
  groupCreatedIdx: index("events_group_created_idx").on(t.groupId, t.createdAt),
}));

/** Shared, admin-authored analytics configurations. */
export const analyticsReports = pgTable("analytics_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  queryConfig: jsonb("query_config").$type<Record<string, unknown>>().notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const LODGING_TYPES = ["hotel", "friend_or_family", "undecided"] as const;
export type LodgingType = (typeof LODGING_TYPES)[number];

export const TRAVEL_DIRECTIONS = ["arrival", "departure"] as const;
export type TravelDirection = (typeof TRAVEL_DIRECTIONS)[number];

export const TRAVEL_MODES = ["flight", "bus", "drive", "other", "undecided"] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export const TIME_PERIODS = ["morning", "afternoon", "evening", "night"] as const;
export type TimePeriod = (typeof TIME_PERIODS)[number];

/** Canonical hotel options shared by eligible out-of-town groups. */
export const hotels = pgTable(
  "hotels",
  {
    id: serial("id").primaryKey(),
    canonicalName: text("canonical_name").notNull(),
    locality: text("locality").notNull(),
    region: text("region").notNull().default("OH"),
    normalizedKey: text("normalized_key").notNull(),
    createdByGroupId: integer("created_by_group_id").references(() => groups.id, { onDelete: "set null" }),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    normalizedKeyIdx: uniqueIndex("hotels_normalized_key_idx").on(t.normalizedKey),
    activeIdx: index("hotels_active_idx").on(t.isArchived, t.canonicalName),
  }),
);

/** One shared lodging answer per invitation group. */
export const groupLodgingPlans = pgTable(
  "group_lodging_plans",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    lodgingType: text("lodging_type").$type<LodgingType>().notNull(),
    hotelId: integer("hotel_id").references(() => hotels.id, { onDelete: "set null" }),
    localArea: text("local_area"),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    groupIdx: uniqueIndex("group_lodging_plans_group_idx").on(t.groupId),
    hotelIdx: index("group_lodging_plans_hotel_idx").on(t.hotelId),
    lodgingShape: check(
      "group_lodging_plans_shape",
      sql`(${t.lodgingType} = 'hotel' and ${t.hotelId} is not null and ${t.localArea} is null)
        or (${t.lodgingType} = 'friend_or_family' and ${t.hotelId} is null and ${t.localArea} is not null)
        or (${t.lodgingType} = 'undecided' and ${t.hotelId} is null and ${t.localArea} is null)`,
    ),
  }),
);

/** Independent inbound/outbound travel legs so modes can differ. */
export const groupTravelLegs = pgTable(
  "group_travel_legs",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    direction: text("direction").$type<TravelDirection>().notNull(),
    mode: text("mode").$type<TravelMode>().notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    travelDate: text("travel_date"),
    timePeriod: text("time_period").$type<TimePeriod>(),
    airlineCode: text("airline_code"),
    otherAirlineName: text("other_airline_name"),
    flightNumber: text("flight_number"),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    groupDirectionIdx: uniqueIndex("group_travel_legs_group_direction_idx").on(t.groupId, t.direction),
    groupIdx: index("group_travel_legs_group_idx").on(t.groupId),
    directionValid: check("group_travel_legs_direction_valid", sql`${t.direction} in ('arrival', 'departure')`),
    modeValid: check("group_travel_legs_mode_valid", sql`${t.mode} in ('flight', 'bus', 'drive', 'other', 'undecided')`),
    timePeriodValid: check("group_travel_legs_time_period_valid", sql`${t.timePeriod} is null or ${t.timePeriod} in ('morning', 'afternoon', 'evening', 'night')`),
    legShape: check(
      "group_travel_legs_shape",
      sql`(${t.mode} = 'flight' and ${t.scheduledAt} is not null and ${t.airlineCode} is not null and ${t.travelDate} is null and ${t.timePeriod} is null)
        or (${t.mode} = 'bus' and ${t.scheduledAt} is not null and ${t.airlineCode} is null and ${t.travelDate} is null and ${t.timePeriod} is null)
        or (${t.mode} = 'drive' and ${t.scheduledAt} is null and ${t.airlineCode} is null and ${t.travelDate} is not null and ${t.timePeriod} is not null)
        or (${t.mode} in ('other', 'undecided') and ${t.scheduledAt} is null and ${t.airlineCode} is null and ${t.travelDate} is null and ${t.timePeriod} is null)`,
    ),
  }),
);

export type Group = typeof groups.$inferSelect;
export type GroupPhone = typeof groupPhones.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type Rsvp = typeof rsvps.$inferSelect;
export type Event = typeof events.$inferSelect;
export type AnalyticsReport = typeof analyticsReports.$inferSelect;
export type Hotel = typeof hotels.$inferSelect;
export type GroupLodgingPlan = typeof groupLodgingPlans.$inferSelect;
export type GroupTravelLeg = typeof groupTravelLegs.$inferSelect;
