-- Criar tabela de histórico de consultas de crédito
CREATE TABLE IF NOT EXISTS credit_queries_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    query_type TEXT NOT NULL, -- 'CPF' ou 'CNPJ'
    document TEXT NOT NULL, -- O documento consultado (limpo)
    raw_response JSONB NOT NULL, -- Resposta completa das APIs em formato JSON
    performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Analista que realizou a consulta
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para otimizar a listagem de histórico por cliente
CREATE INDEX IF NOT EXISTS idx_credit_queries_customer ON credit_queries_history(customer_id);
