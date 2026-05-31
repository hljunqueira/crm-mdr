-- Adiciona a coluna show_on_landing na tabela devices se não existir
ALTER TABLE devices ADD COLUMN IF NOT EXISTS show_on_landing BOOLEAN DEFAULT FALSE;
