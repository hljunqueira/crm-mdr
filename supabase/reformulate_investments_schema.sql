-- Migration: Reformulate Investments Schema for Prime and Renda Models

-- 1. Add Prime columns to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS investor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS prime_profit_share NUMERIC(5,4) DEFAULT 0.6000;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS prime_admin_fee NUMERIC(5,4) DEFAULT 0.1000;

-- 2. Create receivable_purchases table for Renda model
CREATE TABLE IF NOT EXISTS receivable_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    purchase_price NUMERIC(12,2) NOT NULL,
    total_receivable NUMERIC(12,2) NOT NULL,
    ownership_percentage NUMERIC(5,4) NOT NULL DEFAULT 1.0000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (profile_id, sale_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_investor_id ON devices(investor_id);
CREATE INDEX IF NOT EXISTS idx_receivable_purchases_profile_id ON receivable_purchases(profile_id);
CREATE INDEX IF NOT EXISTS idx_receivable_purchases_sale_id ON receivable_purchases(sale_id);

-- 4. Update PL/pgSQL function to distribute installment payouts
CREATE OR REPLACE FUNCTION distribute_installment_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_device_id UUID;
    v_sale_total_value DECIMAL(12,2);
    v_device_cost_price DECIMAL(12,2);
    v_device_lot_id UUID;
    v_lot_title TEXT;
    
    -- Novo modelo Prime
    v_investor_id UUID;
    v_prime_profit_share DECIMAL(5,4);
    v_prime_admin_fee DECIMAL(5,4);
    
    -- Novo modelo Renda
    r_purchase RECORD;
    
    -- Auxiliares de cálculo
    v_net_value DECIMAL(12,2);
    v_cost_fraction DECIMAL(12,6);
    v_total_amortization DECIMAL(12,2);
    v_total_profit DECIMAL(12,2);
    quota_record RECORD;
    v_investor_amortization DECIMAL(12,2);
    v_investor_profit DECIMAL(12,2);
    v_total_payout DECIMAL(12,2);
BEGIN
    -- Execute only when status transitions to 'paid'
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> 'paid') THEN
        -- Get device and sale info
        SELECT device_id, total_value INTO v_sale_device_id, v_sale_total_value
        FROM sales WHERE id = NEW.sale_id;

        IF v_sale_device_id IS NOT NULL THEN
            SELECT cost_price, lot_id, investor_id, prime_profit_share, prime_admin_fee 
            INTO v_device_cost_price, v_device_lot_id, v_investor_id, v_prime_profit_share, v_prime_admin_fee
            FROM devices WHERE id = v_sale_device_id;
        END IF;

        -- 1. MODELO RENDA (Compra de Recebíveis)
        -- Verificar se existe compra registrada para essa venda
        SELECT * INTO r_purchase FROM receivable_purchases WHERE sale_id = NEW.sale_id LIMIT 1;
        IF r_purchase.id IS NOT NULL THEN
            -- Repasse proporcional ao ownership_percentage
            v_total_payout := NEW.value * r_purchase.ownership_percentage;
            
            -- Classificação contábil (Amortização vs Lucro)
            IF r_purchase.total_receivable > 0 THEN
                v_cost_fraction := r_purchase.purchase_price / r_purchase.total_receivable;
            ELSE
                v_cost_fraction := 0;
            END IF;
            v_investor_amortization := v_total_payout * v_cost_fraction;
            v_investor_profit := v_total_payout - v_investor_amortization;
            
            -- Atualiza carteira do investidor Renda
            INSERT INTO wallets (profile_id, balance, future_receipts)
            VALUES (r_purchase.profile_id, v_total_payout, 0)
            ON CONFLICT (profile_id) DO UPDATE
            SET balance = wallets.balance + v_total_payout,
                future_receipts = GREATEST(0, wallets.future_receipts - v_total_payout),
                updated_at = NOW();

            -- Logs
            IF v_investor_amortization > 0 THEN
                INSERT INTO wallet_transactions (profile_id, type, amount, description)
                VALUES (
                    r_purchase.profile_id,
                    'AMORTIZATION',
                    v_investor_amortization,
                    'Amortização Renda Ref: Parcela ' || NEW.installment_number || '/' || NEW.total_installments || ' (Venda #' || NEW.sale_id || ')'
                );
            END IF;

            IF v_investor_profit > 0 THEN
                INSERT INTO wallet_transactions (profile_id, type, amount, description)
                VALUES (
                    r_purchase.profile_id,
                    'PROFIT',
                    v_investor_profit,
                    'Lucro Renda Ref: Parcela ' || NEW.installment_number || '/' || NEW.total_installments || ' (Venda #' || NEW.sale_id || ')'
                );
            END IF;

        -- 2. MODELO PRIME (Investimento de Estoque Próprio)
        ELSIF v_investor_id IS NOT NULL THEN
            -- Amortização: 100% do custo proporcional à parcela
            IF COALESCE(v_sale_total_value, 0) > 0 THEN
                v_investor_amortization := NEW.value * (COALESCE(v_device_cost_price, 0) / v_sale_total_value);
            ELSE
                v_investor_amortization := 0;
            END IF;
            
            -- Lucro Bruto da parcela
            v_total_profit := NEW.value - v_investor_amortization;
            
            -- Lucro Líquido descontando a taxa de administração
            v_total_profit := v_total_profit * (1.0 - COALESCE(v_prime_admin_fee, 0.1000));
            
            -- Lucro do Investidor
            v_investor_profit := v_total_profit * COALESCE(v_prime_profit_share, 0.6000);
            
            v_total_payout := v_investor_amortization + v_investor_profit;

            -- Atualiza carteira do investidor Prime
            INSERT INTO wallets (profile_id, balance, future_receipts)
            VALUES (v_investor_id, v_total_payout, 0)
            ON CONFLICT (profile_id) DO UPDATE
            SET balance = wallets.balance + v_total_payout,
                future_receipts = GREATEST(0, wallets.future_receipts - v_total_payout),
                updated_at = NOW();

            -- Logs
            IF v_investor_amortization > 0 THEN
                INSERT INTO wallet_transactions (profile_id, type, amount, description)
                VALUES (
                    v_investor_id,
                    'AMORTIZATION',
                    v_investor_amortization,
                    'Amortização Prime Ref: Parcela ' || NEW.installment_number || '/' || NEW.total_installments || ' (Celular #' || v_sale_device_id || ')'
                );
            END IF;

            IF v_investor_profit > 0 THEN
                INSERT INTO wallet_transactions (profile_id, type, amount, description)
                VALUES (
                    v_investor_id,
                    'PROFIT',
                    v_investor_profit,
                    'Lucro Prime Ref: Parcela ' || NEW.installment_number || '/' || NEW.total_installments || ' (Celular #' || v_sale_device_id || ')'
                );
            END IF;

        -- 3. MODELO LEGADO (Lote Coletivo)
        ELSIF v_device_lot_id IS NOT NULL THEN
            SELECT title INTO v_lot_title FROM lots WHERE id = v_device_lot_id;
            
            v_net_value := NEW.value * (1.0 - 0.10); -- 10% operational fee legada
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
                    INSERT INTO wallet_transactions (profile_id, type, amount, description)
                    VALUES (
                        quota_record.profile_id,
                        'AMORTIZATION',
                        v_investor_amortization,
                        'Amortização Ref: Parcela ' || NEW.installment_number || '/' || NEW.total_installments || ' (Lote: ' || v_lot_title || ')'
                    );
                END IF;

                IF v_investor_profit > 0 THEN
                    INSERT INTO wallet_transactions (profile_id, type, amount, description)
                    VALUES (
                        quota_record.profile_id,
                        'PROFIT',
                        v_investor_profit,
                        'Lucro de Venda Ref: Parcela ' || NEW.installment_number || '/' || NEW.total_installments || ' (Lote: ' || v_lot_title || ')'
                    );
                END IF;
            END LOOP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
