-- MDR Celulares - Adicionar campo de Senha por Desenho (Pattern Lock) na OS
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS device_pattern_lock TEXT;
