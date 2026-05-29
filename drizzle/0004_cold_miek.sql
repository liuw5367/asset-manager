CREATE TABLE "plan_record_member_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "plan_record_member_notes_record_member_unique" UNIQUE("record_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "plan_records" ADD COLUMN "recorded_total_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "mode" text DEFAULT 'accumulate' NOT NULL;