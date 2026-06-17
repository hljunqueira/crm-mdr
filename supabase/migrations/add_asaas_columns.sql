-- Add Asaas integration columns to installments and customers
ALTER TABLE installments ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS asaas_invoice_url TEXT;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS asaas_sync_status TEXT DEFAULT 'synced';

ALTER TABLE customers ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- Create index on asaas_payment_id for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_installments_asaas_payment_id ON installments(asaas_payment_id);
