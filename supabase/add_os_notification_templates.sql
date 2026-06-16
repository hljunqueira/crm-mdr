-- Migration: Add custom notification templates and terms to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS os_entry_template TEXT,
ADD COLUMN IF NOT EXISTS os_budget_template TEXT,
ADD COLUMN IF NOT EXISTS os_ready_template TEXT,
ADD COLUMN IF NOT EXISTS os_receipt_terms TEXT;
