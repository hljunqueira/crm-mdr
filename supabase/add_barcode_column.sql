-- Migration: Add barcode column to devices table (Optional/not unique globally)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Create an index on barcode for fast lookups
CREATE INDEX IF NOT EXISTS idx_devices_barcode ON devices(barcode);
