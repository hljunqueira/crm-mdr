-- Migration: Atualizar restrição check da coluna status na tabela devices
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_status_check;
ALTER TABLE devices ADD CONSTRAINT devices_status_check CHECK (status IN ('available', 'sold', 'reserved', 'in_repair', 'pending_valuation'));
