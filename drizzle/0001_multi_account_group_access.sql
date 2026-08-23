CREATE TABLE "group_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"slot" integer NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_slot_positive" CHECK ("slot" > 0)
);
--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "groups"
		WHERE "claimed_by_email" IS NOT NULL
		GROUP BY lower("claimed_by_email")
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Cannot migrate group claims: one Google email is currently attached to multiple groups';
	END IF;
END $$;
--> statement-breakpoint
INSERT INTO "group_members" ("group_id", "email", "phone", "slot", "joined_at")
SELECT
	"id",
	lower("claimed_by_email"),
	COALESCE("claimed_by_phone", ''),
	1,
	COALESCE("claimed_at", "created_at")
FROM "groups"
WHERE "claimed_by_email" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_email_idx" ON "group_members" USING btree ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "group_members_group_slot_idx" ON "group_members" USING btree ("group_id", "slot");
--> statement-breakpoint
CREATE INDEX "group_members_group_idx" ON "group_members" USING btree ("group_id");
