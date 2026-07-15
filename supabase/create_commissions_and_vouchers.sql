-- Migration: Create employee_vouchers and commission_settings tables
-- This patch sets up tables for commissions, pro-labore, employee vouchers, and admin profit distributions.

-- 1. Create commission_settings table
CREATE TABLE IF NOT EXISTS commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sales_commission_pct NUMERIC(5, 2) DEFAULT 0.00,
  services_commission_pct NUMERIC(5, 2) DEFAULT 0.00,
  base_salary NUMERIC(12, 2) DEFAULT 0.00,
  sales_goal_bonus_pct NUMERIC(5, 2) DEFAULT 0.00,
  sales_goal_bonus_fixed NUMERIC(12, 2) DEFAULT 0.00,
  os_goal_bonus_fixed NUMERIC(12, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger for commission_settings updated_at
DROP TRIGGER IF EXISTS update_commission_settings_modtime ON commission_settings;
CREATE TRIGGER update_commission_settings_modtime 
BEFORE UPDATE ON commission_settings 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 2. Create employee_vouchers table
CREATE TABLE IF NOT EXISTS employee_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'money', 'bank')),
  type TEXT NOT NULL CHECK (type IN ('vale', 'pro_labore', 'profit_distribution')),
  description TEXT,
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_id UUID REFERENCES cash_shifts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_vouchers_profile ON employee_vouchers(profile_id);
CREATE INDEX IF NOT EXISTS idx_employee_vouchers_unit_date ON employee_vouchers(unit_id, voucher_date);

-- 3. Add voucher_id to cash_transactions for reference integrity
ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES employee_vouchers(id) ON DELETE CASCADE;

-- 4. Enable Row Level Security (RLS) for the new tables
ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_vouchers ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies (Allow read/write for authenticated users / admins)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON commission_settings;
CREATE POLICY "Enable all for authenticated users" ON commission_settings
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON employee_vouchers;
CREATE POLICY "Enable all for authenticated users" ON employee_vouchers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
