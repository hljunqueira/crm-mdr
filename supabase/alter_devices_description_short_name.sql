-- SQL Migration: Adiciona campos de descrição e nome curto à tabela de produtos (devices)
-- Execute este script no editor SQL do Supabase.

ALTER TABLE devices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS short_name VARCHAR(25);
