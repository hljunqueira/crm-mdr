-- Migration: Add selfie url column to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS self_photo_url TEXT;
