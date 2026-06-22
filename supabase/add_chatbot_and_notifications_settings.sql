-- 1. ADICIONAR COLUNAS DE CONFIGURAÇÃO DE CHATBOT E COBRANÇA NA TABELA STORES
ALTER TABLE stores ADD COLUMN IF NOT EXISTS chatbot_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS chatbot_prompt TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS chatbot_payment_terms TEXT;

ALTER TABLE stores ADD COLUMN IF NOT EXISTS billing_reminder_pre_due_days INTEGER DEFAULT 5;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS billing_reminder_pre_due_template TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS billing_reminder_overdue_days INTEGER DEFAULT 5;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS billing_reminder_overdue_template TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS billing_reminder_payment_confirmed_template TEXT;

-- 2. ADICIONAR COLUNAS DE AUTO-CADASTRO E ANÁLISE DE CRÉDITO NA TABELA CUSTOMERS
ALTER TABLE customers ADD COLUMN IF NOT EXISTS document_id_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS document_address_url TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS document_income_url TEXT;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'MEDIO';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_status TEXT DEFAULT 'EM_ANALISE';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS approved_for_purchase BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'PRE_CADASTRO';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS responsible_analyst_id UUID REFERENCES profiles(id);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS needed_credit DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS desired_device TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS desired_installment_value DECIMAL(12, 2) DEFAULT 0;

-- Endereço estruturado
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS state TEXT;

-- 3. AJUSTAR AS POLÍTICAS DO STORAGE BUCKET 'customer-documents'
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remover políticas antigas para evitar conflitos de nomes duplicados
DROP POLICY IF EXISTS "Permitir leitura publica de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload publico de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delecao publica de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from customer-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public upload to customer-documents" ON storage.objects;

-- Criar política para permitir leitura pública de arquivos neste bucket
CREATE POLICY "Permitir leitura publica de documentos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'customer-documents');

-- Criar política para permitir upload (inserção) de arquivos neste bucket
CREATE POLICY "Permitir upload publico de documentos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'customer-documents');

-- Criar política para permitir exclusão/limpeza de arquivos neste bucket
CREATE POLICY "Permitir delecao publica de documentos"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'customer-documents');
