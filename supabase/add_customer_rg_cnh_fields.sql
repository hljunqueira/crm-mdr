-- Add RG and CNH front/back columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rg_frente_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS rg_verso_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cnh_frente_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cnh_verso_url TEXT;
