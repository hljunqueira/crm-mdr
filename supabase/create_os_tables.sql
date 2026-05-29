-- 1. Tabela Principal de Ordens de Serviço (OS)
CREATE TABLE IF NOT EXISTS service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_number SERIAL, -- Número da OS auto-incremental (Ex: OS #0001)
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    unit_id UUID,
    
    -- Categoria e Dados do Equipamento
    device_category VARCHAR(50) NOT NULL DEFAULT 'smartphone', 
    -- 'smartphone', 'tablet', 'notebook', 'desktop', 'printer', 'console', 'other'
    
    device_brand VARCHAR(50) NOT NULL,        -- Apple, Dell, Samsung, HP, Sony
    device_model VARCHAR(100) NOT NULL,       -- Inspiron 15, iPhone 13 Pro, L3150
    device_serial_number VARCHAR(100),       -- Número de Série, IMEI, Service Tag
    device_passcode VARCHAR(50),              -- Senha do usuário / PIN para testes
    cosmetic_condition TEXT,                  -- Arranhões, marcas de uso, dobradiça quebrada, etc.
    accessories_left TEXT[],                  -- Fonte de Alimentação, Cabo USB, Controles, Cartucho, Capinha
    
    -- Laudos e Diagnósticos
    reported_issue TEXT NOT NULL,             -- Defeito relatado pelo cliente
    technical_diagnosis TEXT,                 -- Laudo técnico / Procedimentos realizados
    
    -- Status do Fluxo da OS
    status VARCHAR(50) NOT NULL DEFAULT 'budget_pending', 
    -- 'budget_pending' = Orçamento Pendente
    -- 'awaiting_approval' = Aguardando Aprovação do Cliente
    -- 'in_progress' = Em Execução / Reparo
    -- 'ready' = Pronto para Retirada
    -- 'delivered' = Entregue / Finalizado
    -- 'returned_no_fix' = Devolvido sem Conserto
    -- 'canceled' = Cancelado
    
    -- Datas Importantes
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Financeiro e Valores
    labor_value DECIMAL(10,2) DEFAULT 0.00,  -- Valor da Mão de Obra
    parts_value DECIMAL(10,2) DEFAULT 0.00,  -- Valor somado das Peças Utilizadas da Loja
    total_value DECIMAL(10,2) GENERATED ALWAYS AS (labor_value + parts_value) STORED,
    
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid'
    payment_method VARCHAR(50),                  -- 'pix', 'card', 'cash'
    warranty_period INTEGER DEFAULT 90,          -- Dias de garantia (Padrão legal: 90 dias)
    warranty_notes TEXT,
    
    -- Responsável técnico
    responsible_technician_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Peças e insumos consumidos da OS
CREATE TABLE IF NOT EXISTS service_order_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    part_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_parts ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público/autenticado
CREATE POLICY "Enable all for authenticated users" ON service_orders
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON service_order_parts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
