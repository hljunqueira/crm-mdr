-- Migration: Add WhatsApp and Instagram direct-link fields to stores table
-- Run this SQL in your Supabase dashboard or via psql

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS instagram_username TEXT DEFAULT NULL;

COMMENT ON COLUMN stores.whatsapp_number IS 'Full WhatsApp number with country code, e.g. 5548999990000';
COMMENT ON COLUMN stores.instagram_username IS 'Instagram username without @, e.g. mdr_informatica';
