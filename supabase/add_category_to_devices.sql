-- SQL migration to append the category column to the devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'smartphone';
