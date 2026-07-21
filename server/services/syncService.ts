import { db } from '../db/connection.js';
import { 
  syncQueue, customers, sales, devices, installments, stores, profiles,
  notificationQueue, creditQueriesHistory, repairOrders, repairOrderParts,
  kanbanColumns, deals, leads, automationSettings, automationTemplates,
  deviceBlockLogs, inventoryLogs, suppliers, partners, commissionSettings,
  employeeVouchers, cashShifts, cashTransactions, creditCardBills,
  creditCardBillPayments, monthlyFinancialForecasts, invoices,
  inventoryAudits, inventoryAuditItems, lots, wallets, walletTransactions,
  withdrawalRequests, investorQuotas, receivablePurchases, outsourcedOrders, deviceLocks
} from '../db/schema.js';
import { supabase } from '../lib/supabase.js';
import { eq, and, gt } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

let isSyncing = false;

// Tabela de mapeamento para as entidades Drizzle
const tableMap: Record<string, any> = {
  stores, 
  profiles, 
  customers, 
  devices, 
  sales, 
  installments,
  credit_queries_history: creditQueriesHistory,
  service_orders: repairOrders,
  service_order_parts: repairOrderParts,
  kanban_columns: kanbanColumns,
  deals, 
  leads,
  automation_settings: automationSettings,
  automation_templates: automationTemplates,
  device_block_logs: deviceBlockLogs,
  inventory_logs: inventoryLogs,
  suppliers, 
  partners,
  commission_settings: commissionSettings,
  employee_vouchers: employeeVouchers,
  cash_shifts: cashShifts,
  cash_transactions: cashTransactions,
  credit_card_bills: creditCardBills,
  credit_card_bill_payments: creditCardBillPayments,
  monthly_financial_forecasts: monthlyFinancialForecasts,
  invoices,
  inventory_audits: inventoryAudits,
  inventory_audit_items: inventoryAuditItems,
  lots, 
  wallets,
  wallet_transactions: walletTransactions,
  withdrawal_requests: withdrawalRequests,
  investor_quotas: investorQuotas,
  receivable_purchases: receivablePurchases,
  outsourced_orders: outsourcedOrders,
  device_locks: deviceLocks
};

// Tabelas a sincronizar (excluindo chat/wpp)
const tables = [
  'stores', 
  'profiles', 
  'customers', 
  'devices', 
  'sales', 
  'installments',
  'credit_queries_history',
  'service_orders',
  'service_order_parts',
  'kanban_columns',
  'deals',
  'leads',
  'automation_settings',
  'automation_templates',
  'device_block_logs',
  'inventory_logs',
  'suppliers',
  'partners',
  'commission_settings',
  'employee_vouchers',
  'cash_shifts',
  'cash_transactions',
  'credit_card_bills',
  'credit_card_bill_payments',
  'monthly_financial_forecasts',
  'invoices',
  'inventory_audits',
  'inventory_audit_items',
  'lots',
  'wallets',
  'wallet_transactions',
  'withdrawal_requests',
  'investor_quotas',
  'receivable_purchases',
  'outsourced_orders',
  'device_locks'
];

// Helper para converter snake_case (Postgres) para camelCase (Drizzle)
function snakeToCamel(str: string): string {
  return str.replace(/([-_][a-z])/g, group =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

function mapCloudToLocal(tableName: string, data: any): any {
  if (tableName === 'service_orders') {
    return {
      id: data.id,
      customerId: data.customer_id,
      technicianId: data.responsible_technician_id,
      deviceModel: data.device_model || 'N/A',
      imei: data.device_serial_number || data.imei,
      problemDescription: data.reported_issue || 'N/A',
      techNotes: data.technical_diagnosis,
      estimatedCost: Number(data.labor_value || 0),
      finalCost: Number(data.parts_value || 0),
      entryDate: data.created_at,
      exitDate: data.delivered_at,
      status: data.status || 'budget_pending',
      createdAt: data.created_at,
      syncStatus: 'synced',
      updatedAt: data.updated_at || new Date().toISOString()
    };
  }

  const result: any = {};
  for (const key of Object.keys(data)) {
    let newKey = snakeToCamel(key);
    // Exceção de mapeamento no customers e credit_card_bills
    if (tableName === 'customers' && key === 'unit_id') {
      newKey = 'storeId';
    } else if (tableName === 'credit_card_bills' && key === 'unit_id') {
      newKey = 'unitId';
    }
    
    // Tratamento de conversão numérica para campos conhecidos
    const value = data[key];
    if (value !== null && value !== undefined) {
      if (typeof value === 'string' && !isNaN(Number(value)) && 
          (key.includes('value') || key.includes('price') || key.includes('amount') || key.includes('balance') || key.includes('rate') || key.includes('fee') || key.includes('limit') || key.includes('quantity') || key.includes('count') || key.includes('index') || key.includes('number'))) {
        result[newKey] = Number(value);
      } else {
        result[newKey] = value;
      }
    } else {
      result[newKey] = null;
    }
  }
  result.syncStatus = 'synced';
  return result;
}

// Helper para verificar se a internet está disponível
async function checkInternetConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
      },
      signal: AbortSignal.timeout(3000)
    });
    return res.ok || res.status === 401;
  } catch (e) {
    return false;
  }
}

/**
 * PUSH: Envia as alterações locais (SQLite) para o Supabase
 */
export async function pushLocalChanges() {
  console.log('[Sync] Iniciando push de alterações locais...');
  
  const queue = await db.select().from(syncQueue).orderBy(syncQueue.id);
  
  if (queue.length === 0) {
    console.log('[Sync] Nenhuma alteração local pendente de sincronização.');
    return;
  }

  for (const item of queue) {
    try {
      const payload = JSON.parse(item.payload);
      console.log(`[Sync] Enviando ${item.action} para a tabela ${item.tableName} (ID: ${item.recordId})...`);

      let error = null;

      if (item.action === 'INSERT' || item.action === 'UPDATE') {
        const { error: pgError } = await supabase
          .from(item.tableName)
          .upsert(payload);
        error = pgError;
      } else if (item.action === 'DELETE') {
        const { error: pgError } = await supabase
          .from(item.tableName)
          .delete()
          .eq('id', item.recordId);
        error = pgError;
      }

      if (error) {
        console.error(`[Sync] Erro ao sincronizar item ${item.id} (${item.tableName}):`, error.message);
        break;
      }

      await db.delete(syncQueue).where(eq(syncQueue.id, item.id));
      await updateLocalSyncStatus(item.tableName, item.recordId, 'synced');
    } catch (e) {
      console.error(`[Sync] Erro crítico ao processar item ${item.id} da fila:`, e);
      break;
    }
  }
}

// Atualiza o status do registro local para sincronizado
async function updateLocalSyncStatus(tableName: string, id: string, status: 'synced' | 'pending_insert' | 'pending_update') {
  try {
    const table = tableMap[tableName];
    if (table && 'syncStatus' in table) {
      await db.update(table).set({ syncStatus: status }).where(eq(table.id, id));
    }
  } catch (e) {
    console.error(`[Sync] Falha ao atualizar status de sincronização local para ${tableName}:${id}`, e);
  }
}

/**
 * PULL: Baixa atualizações novas da nuvem (Supabase) para o SQLite
 */
export async function pullCloudChanges() {
  console.log('[Sync] Iniciando pull de atualizações da nuvem...');

  for (const table of tables) {
    try {
      // 1. Descobrir a última data de modificação salva localmente para esta tabela
      let lastUpdatedAt = '1970-01-01T00:00:00.000Z';
      const localRecords = await getLocalRecordsOrderedByUpdate(table);
      if (localRecords && localRecords.length > 0) {
        lastUpdatedAt = localRecords[0].updatedAt || lastUpdatedAt;
      }

      // 2. Buscar registros no Supabase
      let cloudRecords: any[] | null = null;
      const usersMap = new Map<string, string>();

      if (table === 'profiles' && supabaseAdmin) {
        const { data, error } = await supabaseAdmin.from(table).select('*');
        if (error) {
          console.error(`[Sync] Erro no pull admin da tabela profiles:`, error.message);
          continue;
        }
        cloudRecords = data;

        try {
          const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
          if (!usersError && usersData?.users) {
            for (const u of usersData.users) {
              if (u.email) {
                usersMap.set(u.id, u.email);
              }
            }
          }
        } catch (ue) {
          console.error('[Sync] Erro ao obter e-mails do Auth via admin API:', ue);
        }
      } else {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          console.error(`[Sync] Erro no pull da tabela ${table}:`, error.message);
          continue;
        }
        cloudRecords = data;
      }

      if (!cloudRecords || cloudRecords.length === 0) continue;

      console.log(`[Sync] Baixando ${cloudRecords.length} atualizações da tabela ${table} da nuvem...`);

      for (const record of cloudRecords) {
        if (table === 'profiles') {
          const realEmail = usersMap.get(record.id);
          if (realEmail) {
            record.email = realEmail;
          }
        }
        await upsertLocalRecord(table, record);
      }
    } catch (e) {
      console.error(`[Sync] Erro crítico no pull da tabela ${table}:`, e);
    }
  }
}

// Helpers dinâmicos para ler registros locais ordenados por atualização
async function getLocalRecordsOrderedByUpdate(tableName: string): Promise<any[]> {
  try {
    const table = tableMap[tableName];
    if (table && 'updatedAt' in table) {
      return db.select().from(table).orderBy(table.updatedAt).limit(1);
    }
  } catch (e) {
    console.error(`[Sync] Falha ao obter registros locais de ${tableName}:`, e);
  }
  return [];
}

// Helpers dinâmicos para salvar registros vindos do Supabase no SQLite local
async function upsertLocalRecord(tableName: string, data: any) {
  try {
    const table = tableMap[tableName];
    if (!table) return;

    if (tableName === 'profiles') {
      const [existing] = await db.select({ passwordHash: profiles.passwordHash })
        .from(profiles)
        .where(eq(profiles.id, data.id))
        .limit(1);
      data.password_hash = data.password_hash || (existing ? existing.passwordHash : null);
    }

    const mapped = mapCloudToLocal(tableName, data);

    await db.insert(table).values(mapped).onConflictDoUpdate({
      target: table.id,
      set: mapped,
    });
  } catch (e) {
    console.error(`[Sync] Erro ao aplicar upsert local em ${tableName}:`, e);
  }
}

/**
 * Processar Fila de Notificações / Mensagens Offline
 */
export async function processNotificationQueue() {
  console.log('[Sync] Processando fila de notificações offline...');
  const queue = await db.select().from(notificationQueue).orderBy(notificationQueue.id);

  if (queue.length === 0) {
    console.log('[Sync] Nenhuma notificação pendente.');
    return;
  }

  for (const item of queue) {
    try {
      console.log(`[Sync] Disparando notificação agendada offline para ${item.url} (Tentativa: ${item.attempts + 1})...`);
      
      const headers = JSON.parse(item.headers);
      const body = JSON.parse(item.body);

      const res = await fetch(item.url, {
        method: item.method,
        headers,
        body: JSON.stringify(body)
      });

      if (res.ok) {
        console.log(`[Sync] Notificação enviada com sucesso! Removendo item ${item.id} da fila.`);
        await db.delete(notificationQueue).where(eq(notificationQueue.id, item.id));
      } else {
        const errText = await res.text();
        throw new Error(`Servidor respondeu com status ${res.status}: ${errText}`);
      }
    } catch (err: any) {
      const attempts = (item.attempts || 0) + 1;
      console.error(`[Sync] Falha no envio da notificação ${item.id}:`, err.message);

      if (attempts >= 5) {
        console.warn(`[Sync] Excedido o limite de 5 tentativas para notificação ${item.id}. Removendo da fila para evitar bloqueio.`);
        await db.delete(notificationQueue).where(eq(notificationQueue.id, item.id));
      } else {
        await db.update(notificationQueue)
          .set({ 
            attempts, 
            lastError: err.message || 'Erro desconhecido' 
          })
          .where(eq(notificationQueue.id, item.id));
      }
    }
  }
}

/**
 * Inicia o Loop de Sincronização Periódica
 */
export function startSyncService(intervalMs = 15000) {
  console.log('[Sync] Serviço de sincronização em segundo plano iniciado.');
  
  setInterval(async () => {
    if (isSyncing) return;
    
    const isOnline = await checkInternetConnection();
    if (!isOnline) {
      console.log('[Sync] Sem conexão com a internet. Sincronização suspensa.');
      return;
    }

    isSyncing = true;
    try {
      // Processar fila de alterações locais
      await pushLocalChanges();
      // Processar fila de notificações/mensagens pendentes
      await processNotificationQueue();
      // Pull das atualizações da nuvem
      await pullCloudChanges();
    } catch (e) {
      console.error('[Sync] Falha no ciclo de sincronização:', e);
    } finally {
      isSyncing = false;
    }
  }, intervalMs);
}
