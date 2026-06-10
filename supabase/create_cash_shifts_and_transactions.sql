-- Migration: Create cash_shifts and cash_transactions tables

-- 1. Create cash_shifts table
CREATE TABLE IF NOT EXISTS cash_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  opened_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  closed_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  expected_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  expected_digital NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  closing_cash NUMERIC(12,2),
  difference NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by unit and status
CREATE INDEX IF NOT EXISTS idx_cash_shifts_unit_status ON cash_shifts(unit_id, status);

-- 2. Create cash_transactions table
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  shift_id UUID REFERENCES cash_shifts(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('inflow', 'outflow')),
  category TEXT NOT NULL CHECK (category IN ('installment', 'sale', 'suprimento', 'sangria', 'despesa_luz', 'despesa_aluguel', 'outros')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'money', 'card', 'bank')),
  description TEXT,
  installment_id UUID REFERENCES installments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT
);

-- Index for shifts transactions query
CREATE INDEX IF NOT EXISTS idx_cash_transactions_shift ON cash_transactions(shift_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_unit_date ON cash_transactions(unit_id, created_at);
