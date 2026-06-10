-- Migration: Add supplier and purchase_date columns to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS purchase_date DATE;

-- Create indexes for performance if needed
CREATE INDEX IF NOT EXISTS idx_devices_supplier ON devices(supplier);
CREATE INDEX IF NOT EXISTS idx_devices_purchase_date ON devices(purchase_date);
