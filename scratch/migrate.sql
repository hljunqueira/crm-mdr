ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_type_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_type_check CHECK (payment_type IN ('crediario', 'card', 'vista', 'debit'));
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES sales(id) ON DELETE CASCADE;

-- Adicionar 'pending_valuation' ao status do dispositivo
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_status_check;
ALTER TABLE devices ADD CONSTRAINT devices_status_check CHECK (status IN ('available', 'sold', 'reserved', 'in_repair', 'pending_valuation'));

