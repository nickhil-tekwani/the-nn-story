CREATE TABLE "groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"invited_names" text[] DEFAULT '{}' NOT NULL,
	"max_party_size" integer DEFAULT 1 NOT NULL,
	"group_label" text,
	"claimed_by_email" text,
	"claimed_by_phone" text,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_phones" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"phone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"attending" boolean NOT NULL,
	"needs_hotel" boolean DEFAULT false NOT NULL,
	"party_size" integer NOT NULL,
	"party_members" text[] DEFAULT '{}' NOT NULL,
	"dietary_restrictions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hometown" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"email" text,
	"group_id" integer,
	"properties" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_phones" ADD CONSTRAINT "group_phones_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "group_phones_phone_idx" ON "group_phones" USING btree ("phone");
--> statement-breakpoint
CREATE INDEX "group_phones_group_idx" ON "group_phones" USING btree ("group_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_group_idx" ON "rsvps" USING btree ("group_id");
