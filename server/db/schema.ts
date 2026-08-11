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
  chatbotEnabled: integer('chatbot_enabled', { mode: 'boolean' }).default(false),
  chatbotPrompt: text('chatbot_prompt'),
  chatbotPaymentTerms: text('chatbot_payment_terms'),
  billingReminderPreDueDays: integer('billing_reminder_pre_due_days').default(5),
  billingReminderPreDueTemplate: text('billing_reminder_pre_due_template'),
  billingReminderOverdueDays: integer('billing_reminder_overdue_days').default(5),
  billingReminderOverdueTemplate: text('billing_reminder_overdue_template'),
  billingReminderPaymentConfirmedTemplate: text('billing_reminder_payment_confirmed_template'),
  fiscalApiToken: text('fiscal_api_token'),
  fiscalEnvironment: text('fiscal_environment').default('sandbox'),
  fiscalGateway: text('fiscal_gateway').default('focusnfe'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns,
});

// 2. PROFILES (Funcionários/Usuários)
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(), // ID vindo do auth.users (Supabase)
  storeId: text('store_id').references(() => stores.id),
  email: text('email'),
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
  approvedForPurchase: integer('approved_for_purchase', { mode: 'boolean' }).default(false),
  storeId: text('unit_id').references(() => stores.id),
  documentIdUrl: text('document_id_url'),
  documentAddressUrl: text('document_address_url'),
  documentIncomeUrl: text('document_income_url'),
  classification: text('classification').default('MEDIO'),
  creditLimit: real('credit_limit').default(0),
  creditStatus: text('credit_status').default('EM_ANALISE'),
  registrationStatus: text('registration_status').default('PRE_CADASTRO'),
  responsibleAnalystId: text('responsible_analyst_id'),
  neededCredit: real('needed_credit').default(0),
  desiredDevice: text('desired_device'),
  desiredInstallmentValue: real('desired_installment_value').default(0),
  addressNumber: text('address_number'),
  neighborhood: text('neighborhood'),
  city: text('city'),
  state: text('state'),
  rgFrenteUrl: text('rg_frente_url'),
  rgVersoUrl: text('rg_verso_url'),
  cnhFrenteUrl: text('cnh_frente_url'),
  cnhVersoUrl: text('cnh_verso_url'),
  selfPhotoUrl: text('self_photo_url'),
  asaasCustomerId: text('asaas_customer_id'),
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
  category: text('category').default('smartphone'),
  description: text('description'),
  shortName: text('short_name'),
  supplier: text('supplier'),
  purchaseDate: text('purchase_date'),
  barcode: text('barcode'),
  investorId: text('investor_id'),
  primeProfitShare: real('prime_profit_share').default(0.6000),
  primeAdminFee: real('prime_admin_fee').default(0.1000),
  lotId: text('lot_id'),
  tradeInPrice: real('trade_in_price'),
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
  isTradeIn: integer('is_trade_in', { mode: 'boolean' }).default(false),
  tradeInDeviceBrand: text('trade_in_device_brand'),
  tradeInDeviceModel: text('trade_in_device_model'),
  tradeInDeviceImei: text('trade_in_device_imei'),
  tradeInValuation: real('trade_in_valuation').default(0),
  originType: text('origin_type').default('CREDIARIO_LOJA'), // 'CREDIARIO_LOJA' | 'FINANCIAMENTO_CELULAR'
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
  asaasPaymentId: text('asaas_payment_id'),
  asaasInvoiceUrl: text('asaas_invoice_url'),
  asaasSyncStatus: text('asaas_sync_status').default('synced'),
  originType: text('origin_type').default('CREDIARIO_LOJA'), // 'CREDIARIO_LOJA' | 'FINANCIAMENTO_CELULAR'
  repassedAt: text('repassed_at'),
  transferId: text('transfer_id'),
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

// 8. LOCAL CREDENTIALS CACHE (Autenticação Offline)
export const localAuthCache = sqliteTable('local_auth_cache', {
  id: text('id').primaryKey(), // ID do profile
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP')
});

// 9. NOTIFICATION QUEUE [NOVO]
export const notificationQueue = sqliteTable('notification_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull(),
  method: text('method').notNull(),
  headers: text('headers').notNull(), // JSON string
  body: text('body').notNull(), // JSON string
  attempts: integer('attempts').default(0),
  lastError: text('last_error'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP')
});

// 10. CREDIT QUERIES HISTORY
export const creditQueriesHistory = sqliteTable('credit_queries_history', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => customers.id),
  queryType: text('query_type').notNull(),
  document: text('document').notNull(),
  rawResponse: text('raw_response'), // JSON string
  performedBy: text('performed_by').references(() => profiles.id),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 11. REPAIR ORDERS
export const repairOrders = sqliteTable('repair_orders', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => customers.id),
  technicianId: text('technician_id').references(() => profiles.id),
  deviceModel: text('device_model').notNull(),
  imei: text('imei'),
  problemDescription: text('problem_description').notNull(),
  techNotes: text('tech_notes'),
  estimatedCost: real('estimated_cost'),
  finalCost: real('final_cost'),
  entryDate: text('entry_date').default('CURRENT_TIMESTAMP'),
  exitDate: text('exit_date'),
  status: text('status').default('pending'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 12. REPAIR ORDER PARTS
export const repairOrderParts = sqliteTable('repair_order_parts', {
  id: text('id').primaryKey(),
  repairOrderId: text('repair_order_id').references(() => repairOrders.id),
  partName: text('part_name').notNull(),
  quantity: integer('quantity').default(1),
  costPrice: real('cost_price').default(0),
  salePrice: real('sale_price').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 13. KANBAN COLUMNS
export const kanbanColumns = sqliteTable('kanban_columns', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  orderIndex: integer('order_index').notNull(),
  color: text('color').default('border-white'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 14. DEALS
export const deals = sqliteTable('deals', {
  id: text('id').primaryKey(),
  columnId: text('column_id').references(() => kanbanColumns.id),
  customerId: text('customer_id').references(() => customers.id),
  title: text('title').notNull(),
  value: real('value').default(0),
  priority: text('priority').default('Media'),
  assignedTo: text('assigned_to').references(() => profiles.id),
  notes: text('notes'),
  status: text('status').default('open'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 15. LEADS
export const leads = sqliteTable('leads', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone').notNull(),
  message: text('message'),
  source: text('source').default('website'),
  status: text('status').default('new'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 16. AUTOMATION SETTINGS
export const automationSettings = sqliteTable('automation_settings', {
  id: text('id').primaryKey(),
  key: text('key').unique().notNull(),
  value: text('value'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  ...syncColumns
});

// 17. AUTOMATION TEMPLATES
export const automationTemplates = sqliteTable('automation_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  triggerCondition: text('trigger_condition'),
  messageBody: text('message_body').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 18. DEVICE BLOCK LOGS
export const deviceBlockLogs = sqliteTable('device_block_logs', {
  id: text('id').primaryKey(),
  installmentId: text('installment_id').references(() => installments.id),
  customerId: text('customer_id').references(() => customers.id),
  imei: text('imei').notNull(),
  action: text('action').notNull(),
  reason: text('reason'),
  success: integer('success', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 19. INVENTORY LOGS
export const inventoryLogs = sqliteTable('inventory_logs', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').references(() => devices.id),
  action: text('action').notNull(),
  quantityChange: integer('quantity_change'),
  performedBy: text('performed_by').references(() => profiles.id),
  notes: text('notes'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 20. SUPPLIERS
export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  cnpj: text('cnpj'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 21. PARTNERS
export const partners = sqliteTable('partners', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  cnpj: text('cnpj'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  commissionRate: real('commission_rate').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 22. COMMISSION SETTINGS
export const commissionSettings = sqliteTable('commission_settings', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => profiles.id),
  salesCommissionPct: real('sales_commission_pct').default(0),
  servicesCommissionPct: real('services_commission_pct').default(0),
  baseSalary: real('base_salary').default(0),
  salesGoalBonusPct: real('sales_goal_bonus_pct').default(0),
  salesGoalBonusFixed: real('sales_goal_bonus_fixed').default(0),
  osGoalBonusFixed: real('os_goal_bonus_fixed').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 23. EMPLOYEE VOUCHERS
export const employeeVouchers = sqliteTable('employee_vouchers', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => profiles.id),
  unitId: text('unit_id').references(() => stores.id),
  amount: real('amount').notNull(),
  paymentMethod: text('payment_method').notNull(),
  type: text('type').notNull(),
  description: text('description'),
  voucherDate: text('voucher_date').notNull(),
  shiftId: text('shift_id').references(() => cashShifts.id),
  createdBy: text('created_by').references(() => profiles.id),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 24. CASH SHIFTS
export const cashShifts = sqliteTable('cash_shifts', {
  id: text('id').primaryKey(),
  storeId: text('store_id').references(() => stores.id),
  openedBy: text('opened_by').references(() => profiles.id),
  closedBy: text('closed_by').references(() => profiles.id),
  openedAt: text('opened_at').notNull(),
  closedAt: text('closed_at'),
  openingBalance: real('opening_balance').notNull(),
  closingBalance: real('closing_balance'),
  cashierType: text('cashier_type').default('LOJA'), // 'FINANCEIRA', 'LOJA'
  status: text('status').default('open'),
  notes: text('notes'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 25. CASH TRANSACTIONS
export const cashTransactions = sqliteTable('cash_transactions', {
  id: text('id').primaryKey(),
  shiftId: text('shift_id').references(() => cashShifts.id),
  type: text('type').notNull(), // 'in', 'out'
  amount: real('amount').notNull(),
  description: text('description').notNull(),
  paymentMethod: text('payment_method'),
  cashierType: text('cashier_type').default('LOJA'), // 'FINANCEIRA', 'LOJA'
  voucherId: text('voucher_id').references(() => employeeVouchers.id),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 25B. CASHIER TRANSFERS (Repasses Financeira -> Loja)
export const cashierTransfers = sqliteTable('cashier_transfers', {
  id: text('id').primaryKey(),
  storeId: text('store_id').references(() => stores.id),
  destinationStoreId: text('destination_store_id').references(() => stores.id),
  originAccount: text('origin_account').default('Asaas Financeira'),
  fromCashier: text('from_cashier').default('FINANCEIRA'),
  toCashier: text('to_cashier').default('LOJA'),
  amount: real('amount').notNull(),
  description: text('description'),
  includedInstallments: text('included_installments'), // JSON array of installment IDs
  transferredBy: text('transferred_by').references(() => profiles.id),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 26. CREDIT CARD BILLS
export const creditCardBills = sqliteTable('credit_card_bills', {
  id: text('id').primaryKey(),
  unitId: text('unit_id').references(() => stores.id),
  day: integer('day').notNull(),
  description: text('description').notNull(),
  startMonth: integer('start_month').notNull(),
  startYear: integer('start_year').notNull(),
  totalInstallments: integer('total_installments').notNull(),
  value: real('value').notNull(),
  category: text('category').notNull(),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 27. CREDIT CARD BILL PAYMENTS
export const creditCardBillPayments = sqliteTable('credit_card_bill_payments', {
  id: text('id').primaryKey(),
  billId: text('bill_id').references(() => creditCardBills.id),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  paidAt: text('paid_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 28. MONTHLY FINANCIAL FORECASTS
export const monthlyFinancialForecasts = sqliteTable('monthly_financial_forecasts', {
  id: text('id').primaryKey(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  store1Forecast: real('store_1_forecast').default(0),
  store2Forecast: real('store_2_forecast').default(0),
  fixedStoreExpenses: real('fixed_store_expenses').default(0),
  fixedPersonalExpenses: real('fixed_personal_expenses').default(0),
  cardPaymentsInflow: real('card_payments_inflow').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 29. INVOICES
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').references(() => sales.id),
  storeId: text('store_id').references(() => stores.id),
  number: text('number'),
  series: text('series'),
  type: text('type'),
  status: text('status').default('pending'),
  xml: text('xml'),
  pdf: text('pdf'),
  clientName: text('client_name'),
  value: real('value').default(0),
  tax: real('tax').default(0),
  key: text('key'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 30. INVENTORY AUDITS
export const inventoryAudits = sqliteTable('inventory_audits', {
  id: text('id').primaryKey(),
  storeId: text('store_id').references(() => stores.id),
  createdBy: text('created_by').references(() => profiles.id),
  status: text('status').default('in_progress'),
  completedAt: text('completed_at'),
  totalCostDiscrepancy: real('total_cost_discrepancy').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 31. INVENTORY AUDIT ITEMS
export const inventoryAuditItems = sqliteTable('inventory_audit_items', {
  id: text('id').primaryKey(),
  auditId: text('audit_id').references(() => inventoryAudits.id),
  deviceId: text('device_id').references(() => devices.id),
  systemQuantity: integer('system_quantity').default(0),
  physicalQuantity: integer('physical_quantity').default(0),
  costPrice: real('cost_price').default(0),
  salePrice: real('sale_price').default(0),
  reason: text('reason'),
  adjusted: integer('adjusted', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 32. LOTS
export const lots = sqliteTable('lots', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 33. WALLETS
export const wallets = sqliteTable('wallets', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => profiles.id),
  balance: real('balance').default(0),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 34. WALLET TRANSACTIONS
export const walletTransactions = sqliteTable('wallet_transactions', {
  id: text('id').primaryKey(),
  walletId: text('wallet_id').references(() => wallets.id),
  amount: real('amount').notNull(),
  type: text('type').notNull(), // 'deposit', 'withdraw', 'profit_share', etc.
  description: text('description'),
  installmentId: text('installment_id').references(() => installments.id),
  profileId: text('profile_id').references(() => profiles.id),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 35. WITHDRAWAL REQUESTS
export const withdrawalRequests = sqliteTable('withdrawal_requests', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => profiles.id),
  amount: real('amount').notNull(),
  status: text('status').default('pending'), // 'pending', 'approved', 'rejected'
  pixKey: text('pix_key'),
  pixKeyType: text('pix_key_type'),
  notes: text('notes'),
  processedAt: text('processed_at'),
  processedBy: text('processed_by').references(() => profiles.id),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 36. INVESTOR QUOTAS
export const investorQuotas = sqliteTable('investor_quotas', {
  id: text('id').primaryKey(),
  profileId: text('profile_id').references(() => profiles.id),
  amount: real('amount').notNull(),
  quotaRate: real('quota_rate').notNull(),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 37. RECEIVABLE PURCHASES
export const receivablePurchases = sqliteTable('receivable_purchases', {
  id: text('id').primaryKey(),
  installmentId: text('installment_id').references(() => installments.id),
  profileId: text('profile_id').references(() => profiles.id),
  purchaseValue: real('purchase_value').notNull(),
  expectedReturn: real('expected_return').notNull(),
  status: text('status').default('approved'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 38. OUTSOURCED ORDERS
export const outsourcedOrders = sqliteTable('outsourced_orders', {
  id: text('id').primaryKey(),
  osId: text('os_id').references(() => repairOrders.id),
  partnerShopName: text('partner_shop_name').notNull(),
  partnerTechnicianName: text('partner_technician_name'),
  externalStatus: text('external_status').default('sent'),
  externalCost: real('external_cost').default(0),
  trackingCode: text('tracking_code'),
  notes: text('notes'),
  sentAt: text('sent_at').default('CURRENT_TIMESTAMP'),
  returnedAt: text('returned_at'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});

// 39. DEVICE LOCKS
export const deviceLocks = sqliteTable('device_locks', {
  id: text('id').primaryKey(),
  deviceId: text('device_id').references(() => devices.id),
  saleId: text('sale_id').references(() => sales.id),
  lockType: text('lock_type').notNull(),
  icloudEmail: text('icloud_email'),
  icloudPassword: text('icloud_password'),
  icloudLocked: integer('icloud_locked', { mode: 'boolean' }).default(false),
  icloudLockConfirmedBy: text('icloud_lock_confirmed_by').references(() => profiles.id),
  icloudLockConfirmedAt: text('icloud_lock_confirmed_at'),
  mdmDeviceId: text('mdm_device_id'),
  mdmLocked: integer('mdm_locked', { mode: 'boolean' }).default(false),
  mdmKioskMessage: text('mdm_kiosk_message'),
  mdmLastSyncAt: text('mdm_last_sync_at'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  ...syncColumns
});



