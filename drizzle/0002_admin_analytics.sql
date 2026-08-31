CREATE TABLE "analytics_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"query_config" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "events_event_created_idx" ON "events" USING btree ("event", "created_at");
--> statement-breakpoint
CREATE INDEX "events_group_created_idx" ON "events" USING btree ("group_id", "created_at");
