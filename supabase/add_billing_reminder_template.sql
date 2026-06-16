-- Migration: Add custom billing reminder template and cron scheduling parameters to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS billing_reminder_template TEXT,
ADD COLUMN IF NOT EXISTS billing_cron_hour INTEGER DEFAULT 9,
ADD COLUMN IF NOT EXISTS billing_reminder_days_before INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS billing_reminder_days_after INTEGER DEFAULT 5;
