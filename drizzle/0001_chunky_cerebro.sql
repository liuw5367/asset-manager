ALTER TABLE "assets" ADD COLUMN "subscription_stopped_at" date;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "traded_in_at" date;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "trade_in_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "traded_from_asset_id" uuid;