-- SQL Migration: Adicionar colunas de progresso na tabela de metas dos colaboradores
ALTER TABLE collaborator_goals ADD COLUMN IF NOT EXISTS sales_progress NUMERIC DEFAULT 0 NOT NULL;
ALTER TABLE collaborator_goals ADD COLUMN IF NOT EXISTS os_progress INTEGER DEFAULT 0 NOT NULL;
