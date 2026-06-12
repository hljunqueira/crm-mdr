-- Criar tabela de fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    cnpj TEXT,
    address TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    unit_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS e permissões para usuários autenticados
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON suppliers;
CREATE POLICY "Permitir tudo para autenticados" ON suppliers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
