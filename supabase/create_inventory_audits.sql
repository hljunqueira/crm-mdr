-- Tabelas para o módulo de Auditoria e Conferência de Estoque

-- 1. Tabela de Sessões de Auditoria
CREATE TABLE IF NOT EXISTS public.inventory_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'cancelled')) DEFAULT 'in_progress',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMPTZ,
    total_cost_discrepancy NUMERIC(10, 2) DEFAULT 0.00
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.inventory_audits ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Simplificadas (Acesso para todos os perfis autenticados)
CREATE POLICY "Permitir leitura para usuários autenticados" ON public.inventory_audits
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserção para usuários autenticados" ON public.inventory_audits
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualização para usuários autenticados" ON public.inventory_audits
    FOR UPDATE TO authenticated USING (true);


-- 2. Tabela de Itens Auditados
CREATE TABLE IF NOT EXISTS public.inventory_audit_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL REFERENCES public.inventory_audits(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    captured_quantity INT NOT NULL DEFAULT 0,
    physical_quantity INT NOT NULL DEFAULT 0,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    reason TEXT,
    adjusted BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.inventory_audit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de itens para usuários autenticados" ON public.inventory_audit_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserção de itens para usuários autenticados" ON public.inventory_audit_items
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualização de itens para usuários autenticados" ON public.inventory_audit_items
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Permitir deleção de itens para usuários autenticados" ON public.inventory_audit_items
    FOR DELETE TO authenticated USING (true);

-- Índices para melhoria de desempenho
CREATE INDEX IF NOT EXISTS idx_inventory_audits_store_id ON public.inventory_audits(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_items_audit_id ON public.inventory_audit_items(audit_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_items_device_id ON public.inventory_audit_items(device_id);
