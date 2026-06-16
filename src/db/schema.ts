import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * An invited group (household, friend group, or a single individual). One row
 * per invite.
 *  - `invitedNames` is the admin's reference list of who's in the group. Its
 *    length sets `maxPartySize` (the cap on the RSVP form). These names are NOT
 *    shown to guests — guests enter their own attendee names when they RSVP.
 *  - `maxPartySize` is the per-group cap. Defaults to the number of invited
 *    names but can be overridden by an admin.
 *  - A group can have many phone numbers (see `groupPhones`). ANY of them can
 *    claim the invite, but only once.
 *  - `claimedByEmail` is the Google account that claimed this invite (unique, so
 *    one account claims at most one group). `claimedByPhone` is the E.164 number
 *    that was used to claim — surfaced to other group members ("ending in 4040")
 *    so they know who to ask to manage the RSVP.
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
    // true = needs a hotel, false = already in the Cincinnati area
    needsHotel: boolean("needs_hotel").notNull().default(false),
    partySize: integer("party_size").notNull(),
    partyMembers: text("party_members").array().notNull().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    groupIdx: uniqueIndex("rsvps_group_idx").on(t.groupId),
  }),
);

export type Group = typeof groups.$inferSelect;
export type GroupPhone = typeof groupPhones.$inferSelect;
export type Rsvp = typeof rsvps.$inferSelect;
