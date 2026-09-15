CREATE TABLE "hotels" (
	"id" serial PRIMARY KEY NOT NULL,
	"canonical_name" text NOT NULL,
	"locality" text NOT NULL,
	"region" text DEFAULT 'OH' NOT NULL,
	"normalized_key" text NOT NULL,
	"created_by_group_id" integer,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_lodging_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"lodging_type" text NOT NULL,
	"hotel_id" integer,
	"local_area" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_lodging_plans_shape" CHECK (("lodging_type" = 'hotel' and "hotel_id" is not null and "local_area" is null) or ("lodging_type" = 'friend_or_family' and "hotel_id" is null and "local_area" is not null) or ("lodging_type" = 'undecided' and "hotel_id" is null and "local_area" is null))
);
--> statement-breakpoint
CREATE TABLE "group_travel_legs" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"direction" text NOT NULL,
	"mode" text NOT NULL,
	"scheduled_at" timestamp with time zone,
	"travel_date" text,
	"time_period" text,
	"airline_code" text,
	"other_airline_name" text,
	"flight_number" text,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_travel_legs_direction_valid" CHECK ("direction" in ('arrival', 'departure')),
	CONSTRAINT "group_travel_legs_mode_valid" CHECK ("mode" in ('flight', 'bus', 'drive', 'other', 'undecided')),
	CONSTRAINT "group_travel_legs_time_period_valid" CHECK ("time_period" is null or "time_period" in ('morning', 'afternoon', 'evening', 'night')),
	CONSTRAINT "group_travel_legs_shape" CHECK (("mode" = 'flight' and "scheduled_at" is not null and "airline_code" is not null and "travel_date" is null and "time_period" is null) or ("mode" = 'bus' and "scheduled_at" is not null and "airline_code" is null and "travel_date" is null and "time_period" is null) or ("mode" = 'drive' and "scheduled_at" is null and "airline_code" is null and "travel_date" is not null and "time_period" is not null) or ("mode" in ('other', 'undecided') and "scheduled_at" is null and "airline_code" is null and "travel_date" is null and "time_period" is null))
);
--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_created_by_group_id_groups_id_fk" FOREIGN KEY ("created_by_group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "group_lodging_plans" ADD CONSTRAINT "group_lodging_plans_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "group_lodging_plans" ADD CONSTRAINT "group_lodging_plans_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "group_travel_legs" ADD CONSTRAINT "group_travel_legs_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "hotels_normalized_key_idx" ON "hotels" USING btree ("normalized_key");
--> statement-breakpoint
CREATE INDEX "hotels_active_idx" ON "hotels" USING btree ("is_archived", "canonical_name");
--> statement-breakpoint
CREATE UNIQUE INDEX "group_lodging_plans_group_idx" ON "group_lodging_plans" USING btree ("group_id");
--> statement-breakpoint
CREATE INDEX "group_lodging_plans_hotel_idx" ON "group_lodging_plans" USING btree ("hotel_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "group_travel_legs_group_direction_idx" ON "group_travel_legs" USING btree ("group_id", "direction");
--> statement-breakpoint
CREATE INDEX "group_travel_legs_group_idx" ON "group_travel_legs" USING btree ("group_id");
