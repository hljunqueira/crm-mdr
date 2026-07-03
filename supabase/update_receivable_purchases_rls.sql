-- Habilitar RLS se não estiver
ALTER TABLE receivable_purchases ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar duplicados
DROP POLICY IF EXISTS "Admins possuem controle total de receivable_purchases" ON receivable_purchases;
DROP POLICY IF EXISTS "Investidores podem ver suas proprias compras" ON receivable_purchases;

-- Criar política para Admins (leitura/escrita total)
CREATE POLICY "Admins possuem controle total de receivable_purchases" ON receivable_purchases
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'master')
    )
  );

-- Criar política para investidores verem suas próprias compras
CREATE POLICY "Investidores podem ver suas proprias compras" ON receivable_purchases
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
  );
