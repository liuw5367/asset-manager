ALTER TABLE "profiles" ADD COLUMN "backup_enabled" boolean DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "backup_day_of_month" integer DEFAULT 1;
ALTER TABLE "profiles" ADD COLUMN "backup_frequency" text DEFAULT 'monthly';
