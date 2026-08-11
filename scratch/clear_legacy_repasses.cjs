const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== INSPEspecionando TODAS AS VENDAS PARA REPASSE ===");

  const { data: sales, error: sErr } = await supabase
    .from('sales')
    .select('id, total_value, original_price, down_payment, origin_type, device_model_manual, created_at, installments_count, customers(name)');

  if (sErr) console.error("Sales err:", sErr);
  console.log(`Total de vendas no banco: ${sales?.length || 0}`);

  const { data: transfers, error: tErr } = await supabase
    .from('cashier_transfers')
    .select('*');

  console.log(`Total de repasses já registrados: ${transfers?.length || 0}`);

  const repassedIds = new Set();
  (transfers || []).forEach(t => {
    if (t.included_installments) {
      try {
        const arr = JSON.parse(t.included_installments);
        if (Array.isArray(arr)) arr.forEach(id => repassedIds.add(id));
      } catch (e) {}
    }
  });

  const pendingSales = (sales || []).filter(s => {
    const isFinanc = s.origin_type === 'FINANCIAMENTO_CELULAR' || (Number(s.installments_count) > 1 && s.origin_type !== 'CREDIARIO_LOJA');
    return isFinanc && !repassedIds.has(s.id);
  });

  console.log(`Vendas pendentes de repasse não zeradas: ${pendingSales.length}`);
  pendingSales.forEach(s => {
    console.log(`- ID: ${s.id} | Cliente: ${s.customers?.name} | OriginalPrice: R$ ${s.original_price} | TotalVal: R$ ${s.total_value} | Down: R$ ${s.down_payment} | Model: ${s.device_model_manual}`);
  });
}

run().catch(console.error);
