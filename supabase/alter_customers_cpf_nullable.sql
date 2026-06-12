-- 1. Remover a restrição de NOT NULL da coluna cpf na tabela customers
ALTER TABLE customers ALTER COLUMN cpf DROP NOT NULL;

-- 2. Remover a constraint de UNIQUE antiga (se existir)
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_cpf_key;

-- 3. Criar uma nova constraint UNIQUE parcial, que ignora valores nulos ou vazios
-- Isso garante que CPFs/CNPJs preenchidos continuem sendo únicos, mas permite múltiplos registros em branco/nulos
CREATE UNIQUE INDEX IF NOT EXISTS customers_cpf_partial_idx ON customers (cpf) WHERE (cpf IS NOT NULL AND cpf <> '');
