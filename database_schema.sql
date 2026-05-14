-- MDR Celulares - Complete Database Schema (PostgreSQL / Supabase)
-- This schema covers CRM, Chat, Sales, Finance, Repairs and Automation.

-- 1. STORES (Units)
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT,
    address TEXT,
    phone TEXT,
    evolution_api_url TEXT,
    evolution_api_key TEXT,
    evolution_instance TEXT,
    logo_url TEXT,
    theme_color TEXT DEFAULT '#4BE277',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROFILES (Users/Staff) 
-- Linked to Supabase Auth
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id),
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'attendant' CHECK (role IN ('admin', 'attendant', 'technician')),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CUSTOMERS
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'overdue', 'blocked')),
    notes TEXT,
    last_payment_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DEVICES (Inventory / Products)
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id),
    model TEXT NOT NULL,
    brand TEXT NOT NULL, -- iPhone, Samsung, etc.
    imei TEXT UNIQUE,
    serial_number TEXT UNIQUE,
    condition TEXT CHECK (condition IN ('new', 'used', 'refurbished')),
    cost_price DECIMAL(12, 2) NOT NULL,
    sale_price DECIMAL(12, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved', 'in_repair')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SALES
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id),
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    seller_id UUID REFERENCES profiles(id),
    device_id UUID REFERENCES devices(id), -- Optional if generic sale
    device_model_manual TEXT,
    imei_manual TEXT,
    total_value DECIMAL(12, 2) NOT NULL,
    down_payment DECIMAL(12, 2) DEFAULT 0,
    installments_count INTEGER DEFAULT 1,
    service_fee DECIMAL(12, 2) DEFAULT 0,
    original_price DECIMAL(12, 2) DEFAULT 0,
    sale_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INSTALLMENTS (Finance)
CREATE TABLE IF NOT EXISTS installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    total_installments INTEGER NOT NULL,
    value DECIMAL(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    payment_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue', 'blocked', 'cancelled')),
    payment_method TEXT CHECK (payment_method IN ('pix', 'money', 'card', 'transfer')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. REPAIR ORDERS
CREATE TABLE IF NOT EXISTS repair_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES profiles(id),
    device_model TEXT NOT NULL,
    imei TEXT,
    problem_description TEXT NOT NULL,
    tech_notes TEXT,
    estimated_cost DECIMAL(12, 2),
    final_cost DECIMAL(12, 2),
    entry_date TIMESTAMPTZ DEFAULT NOW(),
    exit_date TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'waiting_parts', 'repairing', 'ready', 'delivered', 'cancelled'))
);

-- 7. KANBAN (CRM / Funnel)
CREATE TABLE IF NOT EXISTS kanban_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    color TEXT DEFAULT 'border-white',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    column_id UUID REFERENCES kanban_columns(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id), -- Optional lead conversion
    title TEXT NOT NULL,
    value DECIMAL(12, 2) DEFAULT 0,
    priority TEXT DEFAULT 'Media' CHECK (priority IN ('Alta', 'Media', 'Baixa')),
    assigned_to UUID REFERENCES profiles(id),
    notes TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. LEADS (Marketing / Landing Page)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    message TEXT,
    source TEXT DEFAULT 'website',
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CHAT
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    lead_id UUID REFERENCES leads(id),
    platform TEXT CHECK (platform IN ('WhatsApp', 'Instagram', 'Email', 'Web')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id), -- Null if sent by customer/lead
    content TEXT NOT NULL,
    is_from_customer BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. AUTOMATION & LOGS
CREATE TABLE IF NOT EXISTS automation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- 'Lembrete Antecipado', 'Aviso de Vencimento', etc.
    trigger_condition TEXT, -- '3_days_before', 'due_day', etc.
    message_body TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS device_block_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installment_id UUID REFERENCES installments(id),
    customer_id UUID REFERENCES customers(id),
    imei TEXT NOT NULL,
    action TEXT NOT NULL, -- 'block', 'unblock'
    reason TEXT,
    success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID REFERENCES devices(id),
    action TEXT NOT NULL, -- 'entry', 'sale', 'repair_entry', 'repair_exit'
    quantity_change INTEGER,
    performed_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. INDEXES for performance
CREATE INDEX idx_installments_sale_id ON installments(sale_id);
CREATE INDEX idx_installments_status ON installments(status);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_repair_orders_customer_id ON repair_orders(customer_id);
CREATE INDEX idx_customers_cpf ON customers(cpf);
CREATE INDEX idx_deals_column ON deals(column_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_installments_due ON installments(due_date);
CREATE INDEX IF NOT EXISTS idx_devices_model ON devices(model);

-- 12. TRIGGERS for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_customers_modtime BEFORE UPDATE ON customers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_deals_modtime BEFORE UPDATE ON deals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_automation_settings_modtime BEFORE UPDATE ON automation_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 13. AUTOMATION TRIGGERS
-- Automatic inventory status update when a sale is recorded
CREATE OR REPLACE FUNCTION handle_new_sale_inventory()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.device_id IS NOT NULL THEN
        UPDATE devices SET status = 'sold' WHERE id = NEW.device_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_sale_update_inventory
AFTER INSERT ON sales
FOR EACH ROW EXECUTE PROCEDURE handle_new_sale_inventory();

-- Automatic customer status update when installment is overdue
CREATE OR REPLACE FUNCTION update_customer_overdue_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers SET status = 'overdue' 
    WHERE id = (SELECT customer_id FROM sales WHERE id = NEW.sale_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_installment_overdue
AFTER UPDATE OF status ON installments
FOR EACH ROW WHEN (NEW.status = 'overdue')
EXECUTE PROCEDURE update_customer_overdue_status();
