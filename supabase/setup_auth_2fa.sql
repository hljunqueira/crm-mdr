-- 1. Criar a tabela para controle de códigos OTP temporários
CREATE TABLE IF NOT EXISTS auth_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS (Row Level Security) na tabela auth_otps por segurança
ALTER TABLE auth_otps ENABLE ROW LEVEL SECURITY;

-- 3. Criar política para permitir acesso completo apenas para a service role (ignorado no backend)
CREATE POLICY "Allow service role access" ON auth_otps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Inicializar configuração do 2FA na tabela automation_settings se não existir
INSERT INTO automation_settings (key, value, is_active)
VALUES ('two_factor_auth_enabled', 'false', true)
ON CONFLICT (key) DO NOTHING;
