-- Criar tabela de notas fiscais se não existir
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number TEXT NOT NULL,
    type TEXT NOT NULL, -- 'NF-e (Produto)' ou 'NFS-e (Serviço)'
    client_name TEXT NOT NULL,
    value DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processing', -- 'authorized', 'processing', 'cancelled'
    key TEXT,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS e permissões para usuários autenticados
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON invoices;
CREATE POLICY "Permitir tudo para autenticados" ON invoices
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Adicionar colunas de configuração fiscal na tabela de stores se não existirem
ALTER TABLE stores ADD COLUMN IF NOT EXISTS fiscal_api_token TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS fiscal_environment TEXT DEFAULT 'sandbox';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS fiscal_gateway TEXT DEFAULT 'focusnfe';
