-- Update check constraint on customers classification to allow 'A_VISTA'
ALTER TABLE customers DROP CONSTRAINT IF EXISTS chk_customers_classification;
ALTER TABLE customers ADD CONSTRAINT chk_customers_classification CHECK (classification IN ('BOM', 'MEDIO', 'RUIM', 'A_VISTA'));
