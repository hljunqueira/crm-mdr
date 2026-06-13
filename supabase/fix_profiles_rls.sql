-- Habilitar RLS na tabela profiles (caso não esteja habilitado)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;

-- Criar política de leitura pública para usuários autenticados
CREATE POLICY "Permitir leitura para autenticados" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);
