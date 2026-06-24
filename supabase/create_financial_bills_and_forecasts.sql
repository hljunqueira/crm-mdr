-- Criar tabela de contas a pagar de cartões (Mensal Fixo - Cartão)
CREATE TABLE IF NOT EXISTS credit_card_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK (day >= 1 AND day <= 31),
  description TEXT NOT NULL,
  start_month INTEGER NOT NULL CHECK (start_month >= 1 AND start_month <= 12),
  start_year INTEGER NOT NULL,
  total_installments INTEGER NOT NULL CHECK (total_installments >= 1),
  value NUMERIC(15, 2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('store', 'personal')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e criar política de segurança para credit_card_bills
ALTER TABLE credit_card_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON credit_card_bills;
CREATE POLICY "Permitir tudo para autenticados" ON credit_card_bills
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Criar tabela de marcação de pagamento das parcelas de cartões
CREATE TABLE IF NOT EXISTS credit_card_bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES credit_card_bills(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  paid_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bill_id, month, year)
);

-- Habilitar RLS e criar política de segurança para credit_card_bill_payments
ALTER TABLE credit_card_bill_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON credit_card_bill_payments;
CREATE POLICY "Permitir tudo para autenticados" ON credit_card_bill_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Criar tabela de previsões financeiras e custos fixos mensais
CREATE TABLE IF NOT EXISTS monthly_financial_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  store_1_forecast NUMERIC(15, 2) DEFAULT 0.0,
  store_2_forecast NUMERIC(15, 2) DEFAULT 0.0,
  fixed_store_expenses NUMERIC(15, 2) DEFAULT 0.0,
  fixed_personal_expenses NUMERIC(15, 2) DEFAULT 0.0,
  card_payments_inflow NUMERIC(15, 2) DEFAULT 0.0, -- Entrada cartão Mes
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month, year)
);

-- Habilitar RLS e criar política de segurança para monthly_financial_forecasts
ALTER TABLE monthly_financial_forecasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON monthly_financial_forecasts;
CREATE POLICY "Permitir tudo para autenticados" ON monthly_financial_forecasts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
