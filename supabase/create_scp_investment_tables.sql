-- 1. Create Lots table
CREATE TABLE IF NOT EXISTS lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_STOCK', 'IN_SALES', 'CLOSED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add lot_id reference to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES lots(id) ON DELETE SET NULL;

-- 3. Create Investor Quotas table
CREATE TABLE IF NOT EXISTS investor_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    amount_invested DECIMAL(12, 2) NOT NULL,
    ownership_percentage DECIMAL(5, 4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (profile_id, lot_id)
);

-- 4. Create Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    balance DECIMAL(12, 2) DEFAULT 0,
    future_receipts DECIMAL(12, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Wallet Transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('AMORTIZATION', 'PROFIT', 'WITHDRAWAL')),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_lot_id ON devices(lot_id);
CREATE INDEX IF NOT EXISTS idx_investor_quotas_lot_id ON investor_quotas(lot_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_profile_id ON wallet_transactions(profile_id);

-- 7. PL/pgSQL Trigger Function for Automatic SCP Payouts
CREATE OR REPLACE FUNCTION distribute_installment_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_sale_device_id UUID;
    v_sale_total_value DECIMAL(12,2);
    v_device_cost_price DECIMAL(12,2);
    v_device_lot_id UUID;
    v_lot_title TEXT;
    v_operational_fee_rate DECIMAL(5,4) := 0.10; -- 10% operational fee
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
            SELECT cost_price, lot_id INTO v_device_cost_price, v_device_lot_id
            FROM devices WHERE id = v_sale_device_id;

            -- Check if device is linked to a lot
            IF v_device_lot_id IS NOT NULL THEN
                SELECT title INTO v_lot_title FROM lots WHERE id = v_device_lot_id;

                -- Calculations
                v_net_value := NEW.value * (1.0 - v_operational_fee_rate);
                v_cost_fraction := v_device_cost_price / v_sale_total_value;
                v_total_amortization := v_net_value * v_cost_fraction;
                v_total_profit := v_net_value - v_total_amortization;

                -- Payout loop for each investor with quota
                FOR quota_record IN 
                    SELECT profile_id, ownership_percentage FROM investor_quotas WHERE lot_id = v_device_lot_id
                LOOP
                    v_investor_amortization := v_total_amortization * quota_record.ownership_percentage;
                    v_investor_profit := v_total_profit * quota_record.ownership_percentage;
                    v_total_payout := v_investor_amortization + v_investor_profit;

                    -- Update/Create investor wallet
                    INSERT INTO wallets (profile_id, balance, future_receipts)
                    VALUES (quota_record.profile_id, v_total_payout, 0)
                    ON CONFLICT (profile_id) DO UPDATE
                    SET balance = wallets.balance + v_total_payout,
                        future_receipts = GREATEST(0, wallets.future_receipts - v_total_payout),
                        updated_at = NOW();

                    -- Log transactions
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
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Bind trigger to installments updates
CREATE OR REPLACE TRIGGER trg_distribute_installment_payout
AFTER UPDATE OF status ON installments
FOR EACH ROW
EXECUTE FUNCTION distribute_installment_payout();

