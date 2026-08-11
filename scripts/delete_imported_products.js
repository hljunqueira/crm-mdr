import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Procurando produtos com nome ou descrição "PRODUTO IMPORTADO"...');

  const { data: devices, error: searchError } = await supabase
    .from('devices')
    .select('id, brand, model, description, short_name, cost_price, sale_price, created_at')
    .or('model.ilike.%PRODUTO IMPORTADO%,description.ilike.%PRODUTO IMPORTADO%,short_name.ilike.%PRODUTO IMPORTADO%');

  if (searchError) {
    console.error('Erro ao buscar produtos:', searchError);
    return;
  }

  console.log(`Encontrados ${devices ? devices.length : 0} produtos com "PRODUTO IMPORTADO".`);

  if (devices && devices.length > 0) {
    console.log('Deletando registros encontrados...');
    const idsToDelete = devices.map(d => d.id);

    const { error: delError, count } = await supabase
      .from('devices')
      .delete({ count: 'exact' })
      .in('id', idsToDelete);

    if (delError) {
      console.error('Erro ao deletar produtos:', delError);
    } else {
      console.log(`Sucesso! ${count || idsToDelete.length} produtos "PRODUTO IMPORTADO" foram removidos do banco de dados.`);
    }
  } else {
    console.log('Nenhum produto "PRODUTO IMPORTADO" pendente de remoção no banco.');
  }
}

run();
