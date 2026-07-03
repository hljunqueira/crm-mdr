-- 1. Tabela para Regras de Categorias e Rentabilidade
CREATE TABLE IF NOT EXISTS scp_investment_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL UNIQUE, -- 'bronze', 'silver', 'gold'
    min_amount NUMERIC(12,2) NOT NULL,
    max_amount NUMERIC(12,2),
    default_rate NUMERIC(5,2) NOT NULL, -- Ex: 2.30 para 2.3% a.m.
    benefits TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela para Trilha de Auditoria Geral SCP
CREATE TABLE IF NOT EXISTS scp_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL, -- 'login', 'contract_view', 'purchase_request', 'withdrawal_request', etc.
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Adição de colunas no Perfil do Investidor (profiles)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auto_reinvest BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS investment_category VARCHAR(50) DEFAULT 'bronze';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_interest_rate NUMERIC(5,2);

-- 4. Adição de fotos de garantia/anexos na tabela de recebíveis vendidos
ALTER TABLE receivable_purchases ADD COLUMN IF NOT EXISTS equipment_photos TEXT[];
