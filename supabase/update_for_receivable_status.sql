-- 1. Adicionar coluna status na tabela receivable_purchases
ALTER TABLE receivable_purchases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 2. Atualizar a função distribute_installment_payout()
CREATE OR REPLACE FUNCTION distribute_installment_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_device_id UUID;
    v_sale_total_value DECIMAL(12,2);
    v_sale_original_price DECIMAL(12,2);
    v_sale_payment_type TEXT;
    v_device_cost_price DECIMAL(12,2);
    v_device_lot_id UUID;
    v_lot_title TEXT;
    
    -- Prime Model
    v_investor_id UUID;
    v_prime_profit_share DECIMAL(5,4);
    v_prime_admin_fee DECIMAL(5,4);
    
    -- Renda Model
    r_purchase RECORD;
    
    -- Calculation helpers
    v_net_value DECIMAL(12,2);
    v_cost_fraction DECIMAL(12,6);
    v_total_amortization DECIMAL(12,2);
    v_total_profit DECIMAL(12,2);
    quota_record RECORD;
    v_investor_amortization DECIMAL(12,2);
    v_investor_profit DECIMAL(12,2);
    v_total_payout DECIMAL(12,2);
BEGIN
    -- FLUXO 1: Pagamento Realizado (status -> paid)
    IF TG_OP = 'UPDATE' AND NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> 'paid') THEN
        -- Get device and sale info
        SELECT device_id, total_value, original_price, payment_type 
        INTO v_sale_device_id, v_sale_total_value, v_sale_original_price, v_sale_payment_type
        FROM sales WHERE id = NEW.sale_id;

        IF v_sale_device_id IS NOT NULL THEN
            SELECT cost_price, lot_id, investor_id, prime_profit_share, prime_admin_fee 
            INTO v_device_cost_price, v_device_lot_id, v_investor_id, v_prime_profit_share, v_prime_admin_fee
            FROM devices WHERE id = v_sale_device_id;
        END IF;

        -- 1. RENDA MODEL (Receivable Purchase) - Filtra apenas aprovados!
        SELECT * INTO r_purchase FROM receivable_purchases WHERE sale_id = NEW.sale_id AND status = 'approved' LIMIT 1;
        IF r_purchase.id IS NOT NULL THEN
            -- Payout proportional to ownership_percentage
            v_total_payout := NEW.value * r_purchase.ownership_percentage;
            
            -- Classification (Amortization vs Profit)
            IF r_purchase.total_receivable > 0 THEN
                v_cost_fraction := r_purchase.purchase_price / r_purchase.total_receivable;
            ELSE
                v_cost_fraction := 0;
            END IF;
            v_investor_amortization := v_total_payout * v_cost_fraction;
            v_investor_profit := v_total_payout - v_investor_amortization;
            
            -- Update wallet
            INSERT INTO wallets (profile_id, balance, future_receipts)
            VALUES (r_purchase.profile_id, v_total_payout, 0)
            ON CONFLICT (profile_id) DO UPDATE
            SET balance = wallets.balance + v_total_payout,
                future_receipts = GREATEST(0, wallets.future_receipts - v_total_payout),
                updated_at = NOW();

            -- Logs
            IF v_investor_amortization > 0 THEN
                INSERT INTO wallet_transactions (profile_id, type, amount, description, capital_portion, interest_portion, installment_id)
                VALUES (
                    r_purchase.profile_id,
                    'AMORTIZATION',
                    v_investor_amortization,
                    'Amortização Renda Ref: Parcela ' || NEW.installment_number || '/' || NEW.total_installments || ' (Venda #' || NEW.sale_id || ')',
                    v_investor_amortization,
                    0,
                    NEW.id
                );
            END IF;

            IF v_investor_profit > 0 THEN
                INSERT INTO wallet_transactions (profile_id, type, amount, description, capital_portion, interest_portion, installment_id)
                VALUES (
                    r_purchase.profile_id,
                    'PROFIT',
                    v_investor_profit,
                    'Lucro Renda Ref: Parcela ' || NEW.installment_number || '/' || NEW.total_installments || ' (Venda #' || NEW.sale_id || ')',
                    0,
                    v_investor_profit,
                    NEW.id
                );
            END IF;

        -- 2. PRIME MODEL (Own Stock Investment)
        ELSIF v_investor_id IS NOT NULL THEN
            -- Differentiate calculations based on payment type:
            IF v_sale_payment_type = 'vista' OR v_sale_payment_type = 'card' THEN
                -- A VISTA / CARTAO (Markup Profit share)
                -- Amortização is the actual cost price of the device, scaled proportionally if partial payment
                IF COALESCE(v_sale_total_value, 0) > 0 THEN
                    v_investor_amortization := NEW.value * (COALESCE(v_device_cost_price, 0) / v_sale_total_value);
                ELSE
                    v_investor_amortization := 0;
                END IF;
            ELSE
                -- CREDIARIO (Finance Interest profit share)
                -- Amortização is the cash original price, scaled proportionally
                IF COALESCE(v_sale_total_value, 0) > 0 THEN
                    v_investor_amortization := NEW.value * (COALESCE(v_sale_original_price, v_device_cost_price, 0) / v_sale_total_value);
                ELSE
                    v_investor_amortization := 0;
                END IF;
            END IF;
            
            -- Payout calculations
            v_total_profit := NEW.value - v_investor_amortization;
            v_total_profit := v_total_profit * (1.0 - COALESCE(v_prime_admin_fee, 0.1000));
            v_investor_profit := v_total_profit * COALESCE(v_prime_profit_share, 0.6000);
            v_total_payout := v_investor_amortization + v_investor_profit;

            -- Update wallet
            INSERT INTO wallets (profile_id, balance, future_receipts)
            VALUES (v_investor_id, v_total_payout, 0)
            ON CONFLICT (profile_id) DO UPDATE
            SET balance = wallets.balance + v_total_payout,
                future_receipts = GREATEST(0, wallets.future_receipts - v_total_payout),
                updated_at = NOW();

            -- Logs
            IF v_investor_amortization > 0 THEN
                INSERT INTO wallet_transactions (profile_id, type, amount, description, capital_portion, interest_portion, installment_id)
                VALUES (
                    v_investor_id,
                    'AMORTIZATION',
                    v_investor_amortization,
                    'Amortização Prime Ref: Parcela ' || NEW.installment_number || '/' || NEW.total_installments || ' (Celular #' || v_sale_device_id || ')',
                    v_investor_amortization,
                    0,
                    NEW.id
                );
            END IF;

            IF v_investor_profit > 0 THEN
                INSERT INTO wallet_transactions (profile_id, type, amount, description, capital_portion, interest_portion, installment_id)
                VALUES (
                    v_investor_id,
                    'PROFIT',
                    v_investor_profit,
                    'Lucro Prime Ref: Parcela ' || NEW.installment_number || '/' || NEW.total_installments || ' (Celular #' || v_sale_device_id || ')',
                    0,
                    v_investor_profit,
                    NEW.id
                );
            END IF;

        -- 3. LEGACY MODEL (Collective Lot)
        ELSIF v_device_lot_id IS NOT NULL THEN
            SELECT title INTO v_lot_title FROM lots WHERE id = v_device_lot_id;
            
            v_net_value := NEW.value * (1.0 - 0.10); -- 10% legacy operational fee
            IF COALESCE(v_sale_total_value, 0) > 0 THEN
                v_cost_fraction := COALESCE(v_device_cost_price, 0) / v_sale_total_value;
            ELSE
                v_cost_fraction := 0;
            END IF;
            v_total_amortization := v_net_value * v_cost_fraction;
            v_total_profit := v_net_value - v_total_amortization;

            FOR quota_record IN 
                SELECT profile_id, ownership_percentage FROM investor_quotas WHERE lot_id = v_device_lot_id
            LOOP
                v_investor_amortization := v_total_amortization * quota_record.ownership_percentage;
                v_investor_profit := v_total_profit * quota_record.ownership_percentage;
                v_total_payout := v_investor_amortization + v_investor_profit;

                INSERT INTO wallets (profile_id, balance, future_receipts)
                VALUES (quota_record.profile_id, v_total_payout, 0)
                ON CONFLICT (profile_id) DO UPDATE
                SET balance = wallets.balance + v_total_payout,
                    future_receipts = GREATEST(0, wallets.future_receipts - v_total_payout),
                    updated_at = NOW();

                IF v_investor_amortization > 0 THEN
                    INSERT INTO wallet_transactions (profile_id, type, amount, description, capital_portion, interest_portion, installment_id)
                    VALUES (
                        quota_record.profile_id,
                        'AMORTIZATION',
                        v_investor_amortization,
                        'Amortização Ref: Parcela ' || NEW.installment_number || '/' || NEW.total_installments || ' (Lote: ' || v_lot_title || ')',
                        v_investor_amortization,
                        0,
                        NEW.id
                    );
                END IF;

                IF v_investor_profit > 0 THEN
                    INSERT INTO wallet_transactions (profile_id, type, amount, description, capital_portion, interest_portion, installment_id)
                    VALUES (
                        quota_record.profile_id,
                        'PROFIT',
                        v_investor_profit,
                        'Lucro de Venda Ref: Parcela ' || NEW.installment_number || '/' || NEW.total_installments || ' (Lote: ' || v_lot_title || ')',
                        0,
                        v_investor_profit,
                        NEW.id
                    );
                END IF;
            END LOOP;
        END IF;
    
    -- FLUXO 2: Estorno / Reversão de Pagamento ou Exclusão (status: paid -> pending/overdue, ou DELETE da parcela)
    ELSIF (TG_OP = 'UPDATE' AND OLD.status = 'paid' AND (NEW.status IS NULL OR NEW.status <> 'paid')) 
       OR (TG_OP = 'DELETE' AND OLD.status = 'paid') THEN
        
        -- Deduct all payouts linked to this installment from investor wallets and delete transactions
        FOR quota_record IN
            SELECT id, profile_id, amount, type FROM wallet_transactions WHERE installment_id = OLD.id
        LOOP
            UPDATE wallets
            SET balance = GREATEST(0, balance - quota_record.amount),
                future_receipts = future_receipts + quota_record.amount,
                updated_at = NOW()
            WHERE profile_id = quota_record.profile_id;
            
            DELETE FROM wallet_transactions WHERE id = quota_record.id;
        END LOOP;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;
