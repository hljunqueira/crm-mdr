import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Buscando últimos produtos cadastrados recentemente (hoje)...');

  // Buscar os 200 produtos mais recentes
  const { data: devices, error: searchError } = await supabase
    .from('devices')
    .select('id, brand, model, description, short_name, cost_price, sale_price, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (searchError) {
    console.error('Erro ao buscar produtos:', searchError);
    return;
  }

  if (!devices || devices.length === 0) {
    console.log('Nenhum produto recente localizado.');
    return;
  }

  // Filtrar produtos criados nas últimas 2 horas
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const recentImported = devices.filter(d => new Date(d.created_at) > twoHoursAgo);

  console.log(`Encontrados ${recentImported.length} produtos importados nas últimas 2 horas.`);

  if (recentImported.length > 0) {
    console.log('Exemplos de produtos a serem removidos:');
    recentImported.slice(0, 5).forEach(d => console.log(`- ID: ${d.id} | Modelo: ${d.model} | Desc: ${d.description} | Criado em: ${d.created_at}`));

    const idsToDelete = recentImported.map(d => d.id);

    // 1. Remover vinculo em inventory_logs
    await supabase
      .from('inventory_logs')
      .update({ device_id: null })
      .in('device_id', idsToDelete);

    // 2. Remover device_locks
    await supabase
      .from('device_locks')
      .delete()
      .in('device_id', idsToDelete);

    // 3. Deletar de devices
    const { error: delError, count } = await supabase
      .from('devices')
      .delete({ count: 'exact' })
      .in('id', idsToDelete);

    if (delError) {
      console.error('Erro ao deletar lote recente:', delError);
    } else {
      console.log(`Sucesso! ${count || idsToDelete.length} produtos da última importação foram removidos do banco.`);
    }
  } else {
    console.log('Nenhum produto recente das últimas 2 horas localizado para apagar.');
  }
}

run();
