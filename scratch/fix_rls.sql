-- 1. Remover politicas antigas restritivas de SELECT em profiles
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.profiles;

-- 2. Criar nova politica permissiva de SELECT permitindo que qualquer usuario autenticado leia os perfis (necessario para assinaturas e listagem de tecnicos/vendedores)
CREATE POLICY "Allow authenticated users to read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 3. Garantir que RLS esteja ativo na tabela user_permissions e que exista politica para autenticados
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.user_permissions;
CREATE POLICY "Enable all for authenticated users" ON public.user_permissions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
