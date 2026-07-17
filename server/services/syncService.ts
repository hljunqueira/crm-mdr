import { db } from '../db/connection.js';
import { syncQueue, customers, sales, devices, installments, stores, profiles } from '../db/schema.js';
import { supabase } from '../lib/supabase.js';
import { eq, and, gt } from 'drizzle-orm';

let isSyncing = false;

// Helper para verificar se a internet está disponível
async function checkInternetConnection(): Promise<boolean> {
  try {
    // Faz um ping rápido no health check do Supabase ou DNS público
    const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
      },
      signal: AbortSignal.timeout(3000)
    });
    return res.ok || res.status === 401; // 401 significa que o servidor respondeu (online)
  } catch (e) {
    return false;
  }
}

/**
 * PUSH: Envia as alterações locais (SQLite) para o Supabase
 */
export async function pushLocalChanges() {
  console.log('[Sync] Iniciando push de alterações locais...');
  
  // 1. Busca todas as ações na fila de sincronização ordenadas por ID (FIFO)
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

      // Executa a operação equivalente no Supabase
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
        // Se houver qualquer erro (rede, RLS ou FK de dependência temporária), paramos o processamento da fila.
        // Isso impede a perda de dados e mantém a fila intacta para tentar novamente no próximo ciclo,
        // após as dependências (como clientes) terem sido puxadas/sincronizadas.
        break;
      }

      // Remove da fila local apenas após sucesso real de gravação na nuvem
      await db.delete(syncQueue).where(eq(syncQueue.id, item.id));

      // Atualiza o status local para synced na tabela correspondente
      await updateLocalSyncStatus(item.tableName, item.recordId, 'synced');
    } catch (e) {
      console.error(`[Sync] Erro crítico ao processar item ${item.id} da fila:`, e);
      break; // Para a fila em caso de erro crítico
    }
  }
}

// Atualiza o status do registro local para sincronizado
async function updateLocalSyncStatus(tableName: string, id: string, status: 'synced' | 'pending_insert' | 'pending_update') {
  try {
    if (tableName === 'customers') {
      await db.update(customers).set({ syncStatus: status }).where(eq(customers.id, id));
    } else if (tableName === 'sales') {
      await db.update(sales).set({ syncStatus: status }).where(eq(sales.id, id));
    } else if (tableName === 'devices') {
      await db.update(devices).set({ syncStatus: status }).where(eq(devices.id, id));
    } else if (tableName === 'installments') {
      await db.update(installments).set({ syncStatus: status }).where(eq(installments.id, id));
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
  const tables = ['stores', 'profiles', 'customers', 'devices', 'sales', 'installments'];

  for (const table of tables) {
    try {
      // 1. Descobrir a última data de modificação salva localmente para esta tabela
      let lastUpdatedAt = '1970-01-01T00:00:00.000Z';
      const localRecords = await getLocalRecordsOrderedByUpdate(table);
      if (localRecords && localRecords.length > 0) {
        lastUpdatedAt = localRecords[0].updated_at || lastUpdatedAt;
      }

      // 2. Buscar registros no Supabase
      const { data: cloudRecords, error } = await supabase
        .from(table)
        .select('*');

      if (error) {
        console.error(`[Sync] Erro no pull da tabela ${table}:`, error.message);
        continue;
      }

      if (!cloudRecords || cloudRecords.length === 0) continue;

      console.log(`[Sync] Baixando ${cloudRecords.length} atualizações da tabela ${table} da nuvem...`);

      // 3. Upsert no SQLite local sem disparar a fila de sync local
      for (const record of cloudRecords) {
        await upsertLocalRecord(table, record);
      }
    } catch (e) {
      console.error(`[Sync] Erro crítico no pull da tabela ${table}:`, e);
    }
  }
}

// Helpers dinâmicos para ler registros locais ordenados por atualização
async function getLocalRecordsOrderedByUpdate(table: string): Promise<any[]> {
  if (table === 'customers') return db.select().from(customers).orderBy(customers.updatedAt).limit(1);
  if (table === 'sales') return db.select().from(sales).orderBy(sales.updatedAt).limit(1);
  if (table === 'devices') return db.select().from(devices).orderBy(devices.updatedAt).limit(1);
  if (table === 'installments') return db.select().from(installments).orderBy(installments.updatedAt).limit(1);
  return [];
}

// Helpers dinâmicos para salvar registros vindos do Supabase no SQLite local
async function upsertLocalRecord(tableName: string, data: any) {
  try {
    if (tableName === 'stores') {
      const mapped = {
        id: data.id,
        name: data.name,
        cnpj: data.cnpj,
        address: data.address,
        phone: data.phone,
        evolutionApiUrl: data.evolution_api_url,
        evolutionApiKey: data.evolution_api_key,
        evolutionInstance: data.evolution_instance,
        logoUrl: data.logo_url,
        themeColor: data.theme_color,
        createdAt: data.created_at,
        syncStatus: 'synced',
        updatedAt: data.updated_at,
        lastSyncBy: data.last_sync_by
      };
      await db.insert(stores).values(mapped).onConflictDoUpdate({
        target: stores.id,
        set: mapped,
      });
    } else if (tableName === 'profiles') {
      const mapped = {
        id: data.id,
        storeId: data.store_id,
        email: data.email,
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        role: data.role,
        active: data.active,
        passwordHash: data.password_hash,
        createdAt: data.created_at,
        syncStatus: 'synced',
        updatedAt: data.updated_at,
        lastSyncBy: data.last_sync_by
      };
      await db.insert(profiles).values(mapped).onConflictDoUpdate({
        target: profiles.id,
        set: mapped,
      });
    } else if (tableName === 'customers') {
      const mapped = {
        id: data.id,
        name: data.name,
        cpf: data.cpf,
        phone: data.phone,
        parentContactPhone: data.parent_contact_phone,
        reference1Name: data.reference1_name,
        reference1Phone: data.reference1_phone,
        reference2Name: data.reference2_name,
        reference2Phone: data.reference2_phone,
        email: data.email,
        address: data.address,
        status: data.status,
        notes: data.notes,
        suggestedDownPayment: Number(data.suggested_down_payment || 0),
        lastPaymentDate: data.last_payment_date,
        approvedForPurchase: data.approved_for_purchase,
        storeId: data.unit_id,
        syncStatus: 'synced',
        updatedAt: data.updated_at,
        lastSyncBy: data.last_sync_by
      };
      await db.insert(customers).values(mapped).onConflictDoUpdate({
        target: customers.id,
        set: mapped,
      });
    } else if (tableName === 'sales') {
      const mapped = {
        id: data.id,
        storeId: data.store_id,
        customerId: data.customer_id,
        sellerId: data.seller_id,
        deviceId: data.device_id,
        deviceModelManual: data.device_model_manual,
        imeiManual: data.imei_manual,
        totalValue: Number(data.total_value || 0),
        downPayment: Number(data.down_payment || 0),
        installmentsCount: Number(data.installments_count || 1),
        serviceFee: Number(data.service_fee || 0),
        originalPrice: Number(data.original_price || 0),
        saleDate: data.sale_date,
        status: data.status,
        paymentType: data.payment_type,
        createdAt: data.created_at,
        syncStatus: 'synced',
        updatedAt: data.updated_at,
        lastSyncBy: data.last_sync_by
      };
      await db.insert(sales).values(mapped).onConflictDoUpdate({
        target: sales.id,
        set: mapped,
      });
    } else if (tableName === 'devices') {
      const mapped = {
        id: data.id,
        storeId: data.store_id,
        model: data.model,
        brand: data.brand,
        imei: data.imei,
        serialNumber: data.serial_number,
        condition: data.condition,
        costPrice: Number(data.cost_price || 0),
        salePrice: Number(data.sale_price || 0),
        stockQuantity: Number(data.stock_quantity || 1),
        status: data.status,
        createdAt: data.created_at,
        syncStatus: 'synced',
        updatedAt: data.updated_at,
        lastSyncBy: data.last_sync_by
      };
      await db.insert(devices).values(mapped).onConflictDoUpdate({
        target: devices.id,
        set: mapped,
      });
    } else if (tableName === 'installments') {
      const mapped = {
        id: data.id,
        saleId: data.sale_id,
        installmentNumber: Number(data.installment_number || 1),
        totalInstallments: Number(data.total_installments || 1),
        value: Number(data.value || 0),
        dueDate: data.due_date,
        paymentDate: data.payment_date,
        status: data.status,
        paymentMethod: data.payment_method,
        createdAt: data.created_at,
        syncStatus: 'synced',
        updatedAt: data.updated_at,
        lastSyncBy: data.last_sync_by
      };
      await db.insert(installments).values(mapped).onConflictDoUpdate({
        target: installments.id,
        set: mapped,
      });
    }
  } catch (e) {
    console.error(`[Sync] Erro ao aplicar upsert local em ${tableName}:`, e);
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
      await pushLocalChanges();
      await pullCloudChanges();
    } catch (e) {
      console.error('[Sync] Falha no ciclo de sincronização:', e);
    } finally {
      isSyncing = false;
    }
  }, intervalMs);
}
