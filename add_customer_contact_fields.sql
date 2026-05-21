-- Add customer family/reference contacts.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS parent_contact_phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reference1_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reference1_phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reference2_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS reference2_phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS suggested_down_payment DECIMAL(12, 2) DEFAULT 0;
