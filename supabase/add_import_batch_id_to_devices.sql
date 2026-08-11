-- SQL para adicionar a coluna import_batch_id na tabela devices no Supabase
ALTER TABLE devices ADD COLUMN IF NOT EXISTS import_batch_id TEXT;
