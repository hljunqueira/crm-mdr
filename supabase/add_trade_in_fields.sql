-- Migration: Add trade-in fields to devices and sales tables
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS trade_in_price DECIMAL(12, 2);

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS is_trade_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trade_in_device_brand TEXT,
ADD COLUMN IF NOT EXISTS trade_in_device_model TEXT,
ADD COLUMN IF NOT EXISTS trade_in_device_imei TEXT,
ADD COLUMN IF NOT EXISTS trade_in_valuation DECIMAL(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS trade_in_sale_price_estimate DECIMAL(12, 2) DEFAULT 0.00;
