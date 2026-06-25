-- Add is_simulation column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_simulation BOOLEAN DEFAULT FALSE;

-- Insert simulation customer if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM customers WHERE cpf = '000.000.000-00') THEN
        INSERT INTO customers (
            name,
            cpf,
            phone,
            classification,
            credit_limit,
            credit_status,
            approved_for_purchase,
            registration_status,
            is_simulation,
            status
        )
        VALUES (
            'SIMULAÇÃO MDR',
            '000.000.000-00',
            '(48) 99999-9999',
            'BOM',
            10000.00,
            'APROVADO',
            TRUE,
            'APROVADO',
            TRUE,
            'active'
        );
    END IF;
END $$;
