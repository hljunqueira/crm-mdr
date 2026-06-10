-- 1. Alterar a restrição de tipo de bloqueio (headwind -> android)
ALTER TABLE device_locks DROP CONSTRAINT IF EXISTS device_locks_lock_type_check;

UPDATE device_locks SET lock_type = 'android' WHERE lock_type = 'headwind';

ALTER TABLE device_locks ADD CONSTRAINT device_locks_lock_type_check CHECK (lock_type IN ('icloud', 'android'));

-- 2. Trigger de Criação Automática de Bloqueio de Aparelho ao Criar Venda no Crediário Loja
CREATE OR REPLACE FUNCTION handle_new_sale_device_lock()
RETURNS TRIGGER AS $$
DECLARE
    v_brand TEXT;
    v_lock_type TEXT;
BEGIN
    -- Se for uma venda no crediário com dispositivo vinculado
    IF NEW.payment_type = 'crediario' AND NEW.device_id IS NOT NULL THEN
        -- Obter a marca do dispositivo
        SELECT brand INTO v_brand FROM devices WHERE id = NEW.device_id;
        
        -- Definir o tipo de trava com base na marca (se Apple -> icloud, senão -> android)
        IF LOWER(v_brand) = 'apple' OR LOWER(v_brand) LIKE '%iphone%' THEN
            v_lock_type := 'icloud';
        ELSE
            v_lock_type := 'android';
        END IF;

        -- Inserir o registro de bloqueio na tabela device_locks
        INSERT INTO device_locks (device_id, sale_id, lock_type, icloud_locked, mdm_locked)
        VALUES (NEW.device_id, NEW.id, v_lock_type, FALSE, FALSE)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Dropar trigger existente se houver e criar
DROP TRIGGER IF EXISTS trg_on_sale_create_device_lock ON sales;
CREATE TRIGGER trg_on_sale_create_device_lock
AFTER INSERT ON sales
FOR EACH ROW EXECUTE PROCEDURE handle_new_sale_device_lock();
