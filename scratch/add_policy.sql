-- Permite que usuários públicos (anon) possam consultar suas Ordens de Serviço por CPF/ID
DROP POLICY IF EXISTS "Permitir leitura publica de ordens de servico" ON service_orders;
CREATE POLICY "Permitir leitura publica de ordens de servico" ON service_orders
    FOR SELECT TO public
    USING (true);

-- Permite também leitura pública das peças associadas a cada OS, para exibir no detalhamento financeiro do portal
DROP POLICY IF EXISTS "Permitir leitura publica de pecas de ordens de servico" ON service_order_parts;
CREATE POLICY "Permitir leitura publica de pecas de ordens de servico" ON service_order_parts
    FOR SELECT TO public
    USING (true);
