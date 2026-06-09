-- MDR Celulares - Adicionar Fotos do Aparelho e Tabela de OS Terceirizadas

-- 1. Coluna de Fotos do Aparelho
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS device_photos TEXT[] DEFAULT '{}';

-- 2. Tabela de OS Terceirizadas
CREATE TABLE IF NOT EXISTS outsourced_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    partner_shop_name VARCHAR(150) NOT NULL,       -- Nome da Loja/Laboratório Parceiro
    partner_technician_name VARCHAR(150),          -- Nome do Técnico Externo
    external_status VARCHAR(50) DEFAULT 'sent',    -- 'sent' (enviado), 'repairing' (em análise), 'ready' (concluído), 'returned' (retornado)
    external_cost DECIMAL(10,2) DEFAULT 0.00,      -- Custo cobrado pelo terceiro
    tracking_code VARCHAR(100),                    -- Código de Rastreamento (motoboy/correios)
    notes TEXT,                                    -- Observações técnicas
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    returned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS e criar políticas
ALTER TABLE outsourced_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON outsourced_orders;
CREATE POLICY "Enable all for authenticated users" ON outsourced_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
