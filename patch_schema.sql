-- MDR Celulares - Database Alignment Patch (2026-05-14)
-- Execute este script no SQL Editor do Supabase para alinhar o banco de dados.

-- 1. Melhorias na Tabela de Vendas
ALTER TABLE sales ADD COLUMN IF NOT EXISTS service_fee DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS original_price DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_type TEXT;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_payment_type_check;
ALTER TABLE sales ADD CONSTRAINT sales_payment_type_check CHECK (payment_type IN ('crediario', 'card', 'vista'));

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
        UPDATE devices 
        SET stock_quantity = GREATEST(0, stock_quantity - 1),
            status = CASE WHEN GREATEST(0, stock_quantity - 1) = 0 THEN 'sold' ELSE status END
        WHERE id = NEW.device_id;
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

-- 5. Tabela de Permissões de Acesso por Usuário (RBAC por Página)
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    page_name TEXT NOT NULL, -- Ex: 'Vendas & Celulares', 'Financeiro', 'Relatórios'
    visible BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, page_name)
);

-- Habilitar RLS e criar política de leitura e escrita para usuários autenticados
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON user_permissions;
CREATE POLICY "Enable all for authenticated users" ON user_permissions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Adição de Assinatura Digital nas Ordens de Serviço (PNG Base64)
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS signature_entry TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS signature_exit TEXT;

-- 7. Coluna de Foto e RLS para a Vitrine Pública de Aparelhos (Fase 3)
ALTER TABLE devices ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de aparelhos disponiveis" ON devices;
CREATE POLICY "Permitir leitura publica de aparelhos disponiveis" ON devices
    FOR SELECT TO public
    USING (status = 'available' AND stock_quantity > 0);

-- 8. Campos de Simulação de Pré-venda na Tabela de Clientes
ALTER TABLE customers ADD COLUMN IF NOT EXISTS desired_device TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS needed_credit DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS desired_installment_value DECIMAL(12, 2) DEFAULT 0;

-- 9. Colunas de Idempotência da Régua de Cobrança em Installments
ALTER TABLE installments ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE installments ADD COLUMN IF NOT EXISTS last_reminder_type TEXT;

