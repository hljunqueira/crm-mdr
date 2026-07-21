const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const userDataPath = process.env.APPDATA 
  ? path.join(process.env.APPDATA, 'react-example')
  : path.join(process.cwd(), 'data');

const dbFile = path.join(userDataPath, 'database.db');
console.log(`Using database: ${dbFile}`);
const sqlite = new Database(dbFile);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env file!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Map sqlite table names to supabase table names
const tableMapping = {
  stores: 'stores',
  profiles: 'profiles',
  customers: 'customers',
  devices: 'devices',
  sales: 'sales',
  installments: 'installments',
  credit_queries_history: 'credit_queries_history',
  repair_orders: 'service_orders', 
  repair_order_parts: 'service_order_parts', 
  kanban_columns: 'kanban_columns',
  deals: 'deals',
  leads: 'leads',
  automation_settings: 'automation_settings',
  automation_templates: 'automation_templates',
  device_block_logs: 'device_block_logs',
  inventory_logs: 'inventory_logs',
  suppliers: 'suppliers',
  partners: 'partners',
  commission_settings: 'commission_settings',
  employee_vouchers: 'employee_vouchers',
  cash_shifts: 'cash_shifts',
  cash_transactions: 'cash_transactions',
  credit_card_bills: 'credit_card_bills',
  credit_card_bill_payments: 'credit_card_bill_payments',
  monthly_financial_forecasts: 'monthly_financial_forecasts',
  invoices: 'invoices',
  inventory_audits: 'inventory_audits',
  inventory_audit_items: 'inventory_audit_items',
  lots: 'lots',
  wallets: 'wallets',
  wallet_transactions: 'wallet_transactions',
  withdrawal_requests: 'withdrawal_requests',
  investor_quotas: 'investor_quotas',
  receivable_purchases: 'receivable_purchases',
  outsourced_orders: 'outsourced_orders',
  device_locks: 'device_locks'
};

// Custom translators to map Postgres columns to SQLite columns for special cases
function translateRow(tableName, record) {
  if (tableName === 'repair_orders') {
    return {
      id: record.id,
      customer_id: record.customer_id,
      technician_id: record.responsible_technician_id,
      device_model: record.device_model || 'N/A',
      imei: record.device_serial_number || record.imei,
      problem_description: record.reported_issue || 'N/A',
      tech_notes: record.technical_diagnosis,
      estimated_cost: Number(record.labor_value || 0),
      final_cost: Number(record.parts_value || 0),
      entry_date: record.created_at,
      exit_date: record.delivered_at,
      status: record.status || 'budget_pending',
      created_at: record.created_at,
      sync_status: 'synced',
      updated_at: record.updated_at || new Date().toISOString(),
      last_sync_by: record.last_sync_by
    };
  }
  return null;
}

async function forceSync() {
  console.log("Starting forced raw sync from Supabase...");
  
  for (const [sqliteTable, supabaseTable] of Object.entries(tableMapping)) {
    try {
      // Check if sqlite table exists
      const tableCheck = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(sqliteTable);
      if (!tableCheck) {
        console.log(`Table '${sqliteTable}' does not exist in SQLite. Skipping.`);
        continue;
      }

      // Get sqlite table columns
      const pragmaInfo = sqlite.prepare(`PRAGMA table_info(\`${sqliteTable}\`)`).all();
      const sqliteColumns = pragmaInfo.map(c => c.name);

      console.log(`Fetching from Supabase table '${supabaseTable}' for SQLite '${sqliteTable}'...`);
      const { data: cloudRecords, error } = await supabase.from(supabaseTable).select('*');
      
      if (error) {
        console.error(`  Error fetching ${supabaseTable} from Supabase:`, error.message);
        continue;
      }

      if (!cloudRecords || cloudRecords.length === 0) {
        console.log(`  No records found in Supabase for '${supabaseTable}'.`);
        continue;
      }

      console.log(`  Syncing ${cloudRecords.length} records...`);

      // Prepare raw INSERT OR REPLACE query
      const placeholders = sqliteColumns.map(() => '?').join(', ');
      const columnsList = sqliteColumns.map(c => `\`${c}\``).join(', ');
      const query = `INSERT OR REPLACE INTO \`${sqliteTable}\` (${columnsList}) VALUES (${placeholders})`;
      
      const insertStmt = sqlite.prepare(query);

      sqlite.transaction(() => {
        for (const record of cloudRecords) {
          const translated = translateRow(sqliteTable, record) || record;
          
          const values = sqliteColumns.map(col => {
            let val = translated[col];
            
            // Map values appropriately
            if (val === undefined) {
              val = null;
            } else if (typeof val === 'boolean') {
              val = val ? 1 : 0;
            } else if (typeof val === 'object' && val !== null) {
              val = JSON.stringify(val);
            }
            return val;
          });
          
          insertStmt.run(values);
        }
      })();

      console.log(`  Successfully synced '${sqliteTable}'.`);
    } catch (err) {
      console.error(`Critical error syncing ${sqliteTable}:`, err.message);
    }
  }

  console.log("Raw database sync completed successfully.");
  process.exit(0);
}

forceSync();
