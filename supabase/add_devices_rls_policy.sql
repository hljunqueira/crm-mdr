-- Habilitar RLS na tabela devices (garantindo que está ativo)
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Permitir leitura publica de aparelhos disponiveis" ON public.devices;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.devices;

-- 1. Política para o público (vitrine): apenas ver aparelhos disponíveis e com estoque
CREATE POLICY "Permitir leitura publica de aparelhos disponiveis" ON public.devices
    FOR SELECT TO public
    USING (status = 'available' AND stock_quantity > 0);

-- 2. Política para usuários autenticados: permissão total de CRUD para gerenciar o estoque
CREATE POLICY "Permitir tudo para autenticados" ON public.devices
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
