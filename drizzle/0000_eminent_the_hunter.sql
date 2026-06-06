CREATE TABLE "guests" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"max_party_size" integer DEFAULT 1 NOT NULL,
	"claimed_by_email" text,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" serial PRIMARY KEY NOT NULL,
	"guest_id" integer NOT NULL,
	"attending" boolean NOT NULL,
	"needs_hotel" boolean DEFAULT false NOT NULL,
	"party_size" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guests_phone_idx" ON "guests" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "guests_claimed_by_email_idx" ON "guests" USING btree ("claimed_by_email");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_guest_idx" ON "rsvps" USING btree ("guest_id");