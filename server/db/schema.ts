import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Colunas padrão de controle de sincronização para offline
const syncColumns = {
  syncStatus: text('sync_status').default('pending_insert'), // 'synced', 'pending_insert', 'pending_update'
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
  lastSyncBy: text('last_sync_by'),
};

// 1. STORES (Unidades)
export const stores = sqliteTable('stores', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  cnpj: text('cnpj'),
  address: text('address'),
  phone: text('phone'),
  evolutionApiUrl: text('evolution_api_url'),
  evolutionApiKey: text('evolution_api_key'),
  evolutionInstance: text('evolution_instance'),
  logoUrl: text('logo_url'),
  themeColor: text('theme_color').default('#4BE277'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns,
});

// 2. PROFILES (Funcionários/Usuários)
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(), // ID vindo do auth.users (Supabase)
  storeId: text('store_id').references(() => stores.id),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  role: text('role').default('attendant'), // admin, attendant, technician, investor
  active: integer('active', { mode: 'boolean' }).default(true),
  passwordHash: text('password_hash'), // Cache local da senha para login offline
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns,
});

// 3. CUSTOMERS (Clientes)
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  cpf: text('cpf'),
  phone: text('phone'),
  parentContactPhone: text('parent_contact_phone'),
  reference1Name: text('reference1_name'),
  reference1Phone: text('reference1_phone'),
  reference2Name: text('reference2_name'),
  reference2Phone: text('reference2_phone'),
  email: text('email'),
  address: text('address'),
  status: text('status').default('active'), // active, overdue, blocked
  notes: text('notes'),
  suggestedDownPayment: real('suggested_down_payment').default(0),
  lastPaymentDate: text('last_payment_date'),
  storeId: text('unit_id').references(() => stores.id),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns,
});

// 4. DEVICES (Estoque / Produtos)
export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  storeId: text('store_id').references(() => stores.id),
  model: text('model').notNull(),
  brand: text('brand').notNull(), // iPhone, Samsung, etc.
  imei: text('imei').unique(),
  serialNumber: text('serial_number').unique(),
  condition: text('condition'), // new, used, refurbished
  costPrice: real('cost_price').notNull(),
  salePrice: real('sale_price').notNull(),
  stockQuantity: integer('stock_quantity').default(1),
  status: text('status').default('available'), // available, sold, reserved, in_repair
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns,
});

// 5. SALES (Vendas)
export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  storeId: text('store_id').references(() => stores.id),
  customerId: text('customer_id').references(() => customers.id),
  sellerId: text('seller_id').references(() => profiles.id),
  deviceId: text('device_id').references(() => devices.id),
  deviceModelManual: text('device_model_manual'),
  imeiManual: text('imei_manual'),
  totalValue: real('total_value').notNull(),
  downPayment: real('down_payment').default(0),
  installmentsCount: integer('installments_count').default(1),
  serviceFee: real('service_fee').default(0),
  originalPrice: real('original_price').default(0),
  saleDate: text('sale_date').default('CURRENT_DATE'),
  status: text('status').default('completed'), // completed, cancelled, refunded
  paymentType: text('payment_type'), // crediario, card, vista
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns,
});

// 6. INSTALLMENTS (Crediários / Parcelas)
export const installments = sqliteTable('installments', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').references(() => sales.id),
  installmentNumber: integer('installment_number').notNull(),
  totalInstallments: integer('total_installments').notNull(),
  value: real('value').notNull(),
  dueDate: text('due_date').notNull(),
  paymentDate: text('payment_date'),
  status: text('status').default('pending'), // paid, pending, overdue, blocked, cancelled
  paymentMethod: text('payment_method'), // pix, money, card, transfer
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns,
});

// 7. OFFLINE SYNC QUEUE (Fila genérica de ações)
export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tableName: text('table_name').notNull(), // ex: 'customers', 'sales'
  action: text('action').notNull(), // 'INSERT', 'UPDATE', 'DELETE'
  recordId: text('record_id').notNull(), // UUID do registro alterado
  payload: text('payload').notNull(), // JSON string com os dados a sincronizar
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});
