import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * The invite list. Each row is one invited household, uploaded by an admin.
 *  - `phone` is stored normalized (digits only, US numbers reduced to 10 digits)
 *    and is unique, so a number can only appear on the list once.
 *  - `maxPartySize` is the per-household cap enforced on the RSVP form.
 *  - `claimedByEmail` is the Google email that claimed this invite. It's unique,
 *    so one Google account can claim at most one invite, and an invite can only
 *    be claimed once.
 */
export const guests = pgTable(
  "guests",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    maxPartySize: integer("max_party_size").notNull().default(1),
    claimedByEmail: text("claimed_by_email"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    phoneIdx: uniqueIndex("guests_phone_idx").on(t.phone),
    claimedByEmailIdx: uniqueIndex("guests_claimed_by_email_idx").on(
      t.claimedByEmail,
    ),
  }),
);

/**
 * One RSVP per invited household.
 */
export const rsvps = pgTable(
  "rsvps",
  {
    id: serial("id").primaryKey(),
    guestId: integer("guest_id")
      .notNull()
      .references(() => guests.id, { onDelete: "cascade" }),
    attending: boolean("attending").notNull(),
    // true = needs a hotel, false = already in the Cincinnati area
    needsHotel: boolean("needs_hotel").notNull().default(false),
    partySize: integer("party_size").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    guestIdx: uniqueIndex("rsvps_guest_idx").on(t.guestId),
  }),
);

export type Guest = typeof guests.$inferSelect;
export type Rsvp = typeof rsvps.$inferSelect;
