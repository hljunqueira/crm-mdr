-- MDR Celulares - Database Alignment Patch (2026-05-14)
-- Execute este script no SQL Editor do Supabase para alinhar o banco de dados.

-- 1. Melhorias na Tabela de Vendas
ALTER TABLE sales ADD COLUMN IF NOT EXISTS service_fee DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS original_price DECIMAL(12, 2) DEFAULT 0;

-- 2. Tabela de Unidades (Suporte a White Label)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#4BE277';

-- 3. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_installments_due ON installments(due_date);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_devices_model ON devices(model);

-- 4. Triggers de Automação
-- Atualização automática de status do estoque ao registrar venda
CREATE OR REPLACE FUNCTION handle_new_sale_inventory()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.device_id IS NOT NULL THEN
        UPDATE devices SET status = 'sold' WHERE id = NEW.device_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_sale_update_inventory ON sales;
CREATE TRIGGER trg_on_sale_update_inventory
AFTER INSERT ON sales
FOR EACH ROW EXECUTE PROCEDURE handle_new_sale_inventory();

-- Atualização automática de status do cliente para 'atrasado' se houver parcela vencida
CREATE OR REPLACE FUNCTION update_customer_overdue_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers SET status = 'overdue' 
    WHERE id = (SELECT customer_id FROM sales WHERE id = NEW.sale_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_installment_overdue ON installments;
CREATE TRIGGER trg_on_installment_overdue
AFTER UPDATE OF status ON installments
FOR EACH ROW WHEN (NEW.status = 'overdue')
EXECUTE PROCEDURE update_customer_overdue_status();
