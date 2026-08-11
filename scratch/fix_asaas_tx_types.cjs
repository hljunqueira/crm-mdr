const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== INSPEspecionando E CORRIGINDO TRANSAÇÕES ASAAS EM CASH_TRANSACTIONS ===");

  const { data: txs, error } = await supabase
    .from('cash_transactions')
    .select('*')
    .ilike('description', '%RECEBIMENTO ASAAS%');

  if (error) console.error("Erro:", error);
  console.log(`Encontradas ${txs?.length || 0} transações de recebimento Asaas:`);

  (txs || []).forEach(t => {
    console.log(`- ID: ${t.id} | Type: ${t.type} | Amount: ${t.amount} | Desc: ${t.description}`);
  });

  // Atualizar para garantir type: 'inflow' em todos os recebimentos Asaas
  const { data: updated, error: uErr } = await supabase
    .from('cash_transactions')
    .update({ type: 'inflow' })
    .ilike('description', '%RECEBIMENTO ASAAS%')
    .select();

  console.log("Transações atualizadas para inflow:", updated?.length, "Error:", uErr);
}

run().catch(console.error);
