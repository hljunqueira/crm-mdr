import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('--- BUSCANDO TRIGGERS NA TABELA SALES ---');
  const { data: triggers, error: trigError } = await supabase
    .rpc('get_triggers_placeholder'); // Let's check if we can query pg_trigger directly via sql query

  // Since we cannot run raw sql easily via rpc if not exposed, let's run a query on pg_trigger using a custom function or RPC if exists.
  // Wait, let's see if we can query pg_catalog using a simple query: supabase doesn't allow raw SQL on client unless we have a specific RPC.
  // Let's check if we have any sql migration files or logs.
  
  console.log('--- CORRIGINDO ESTOQUE DOS DOIS PRODUTOS (Zerar e definir como sold) ---');
  
  const { data: update1, error: err1 } = await supabase
    .from('devices')
    .update({ stock_quantity: 0, status: 'sold' })
    .eq('model', 'nota 2043')
    .select();
    
  if (err1) {
    console.error('Erro ao atualizar nota 2043:', err1);
  } else {
    console.log('Nota 2043 atualizada com sucesso:', update1);
  }

  const { data: update2, error: err2 } = await supabase
    .from('devices')
    .update({ stock_quantity: 0, status: 'sold' })
    .eq('model', 'nota 2033')
    .select();
    
  if (err2) {
    console.error('Erro ao atualizar nota 2033:', err2);
  } else {
    console.log('Nota 2033 atualizada com sucesso:', update2);
  }
}

run();
