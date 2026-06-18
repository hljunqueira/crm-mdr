-- 1. Função de Trigger Atualizada para Suportar Múltiplos Aparelhos por Venda
CREATE OR REPLACE FUNCTION handle_new_sale_device_lock()
RETURNS TRIGGER AS $$
DECLARE
    v_imei TEXT;
    v_device_id UUID;
    v_brand TEXT;
    v_lock_type TEXT;
    v_current_device_ids UUID[] := '{}';
BEGIN
    -- Se for uma venda no crediário
    IF NEW.payment_type = 'crediario' THEN
        -- Se houver imei_manual, processamos todos os IMEIs
        IF NEW.imei_manual IS NOT NULL AND NEW.imei_manual != 'N/A' THEN
            FOR v_imei IN SELECT trim(val) FROM regexp_split_to_table(NEW.imei_manual, ',') AS val LOOP
                IF v_imei != '' AND v_imei != 'N/A' THEN
                    SELECT id, brand INTO v_device_id, v_brand FROM devices WHERE imei = v_imei LIMIT 1;
                    
                    IF v_device_id IS NOT NULL THEN
                        v_current_device_ids := array_append(v_current_device_ids, v_device_id);
                        
                        IF LOWER(v_brand) = 'apple' OR LOWER(v_brand) LIKE '%iphone%' THEN
                            v_lock_type := 'icloud';
                        ELSE
                            v_lock_type := 'android';
                        END IF;
                        
                        INSERT INTO device_locks (device_id, sale_id, lock_type, icloud_locked, mdm_locked)
                        VALUES (v_device_id, NEW.id, v_lock_type, FALSE, FALSE)
                        ON CONFLICT DO NOTHING;
                    END IF;
                END IF;
            END LOOP;
        ELSIF NEW.device_id IS NOT NULL THEN
            v_current_device_ids := array_append(v_current_device_ids, NEW.device_id);
            SELECT brand INTO v_brand FROM devices WHERE id = NEW.device_id;
            IF LOWER(v_brand) = 'apple' OR LOWER(v_brand) LIKE '%iphone%' THEN
                v_lock_type := 'icloud';
            ELSE
                v_lock_type := 'android';
            END IF;
            INSERT INTO device_locks (device_id, sale_id, lock_type, icloud_locked, mdm_locked)
            VALUES (NEW.device_id, NEW.id, v_lock_type, FALSE, FALSE)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Se for UPDATE, remover device_locks que não estão mais na venda
        IF TG_OP = 'UPDATE' THEN
            DELETE FROM device_locks 
            WHERE sale_id = NEW.id AND NOT (device_id = ANY(v_current_device_ids));
        END IF;
    ELSE
        -- Se mudou o pagamento de crediário para outra coisa, remove as travas
        IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
            DELETE FROM device_locks WHERE sale_id = NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recriação do Trigger para ser disparado em INSERT ou UPDATE
DROP TRIGGER IF EXISTS trg_on_sale_create_device_lock ON sales;
CREATE TRIGGER trg_on_sale_create_device_lock
AFTER INSERT OR UPDATE ON sales
FOR EACH ROW EXECUTE PROCEDURE handle_new_sale_device_lock();
