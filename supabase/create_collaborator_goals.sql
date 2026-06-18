-- SQL Migration: Criar tabela de metas dos colaboradores
CREATE TABLE IF NOT EXISTS collaborator_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2026),
    sales_target NUMERIC DEFAULT 0 NOT NULL CHECK (sales_target >= 0),
    os_target INTEGER DEFAULT 0 NOT NULL CHECK (os_target >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profile_id, month, year)
);

-- Habilitar RLS se necessário ou conceder permissões para anon/authenticated
ALTER TABLE collaborator_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated users"
ON collaborator_goals FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow all operations for admins"
ON collaborator_goals FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
