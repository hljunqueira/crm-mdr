const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== BUSCANDO TODAS AS VENDAS PENDENTES DE REPASSE (repassed_at is null) ===");

  const { data: sales, error } = await supabase
    .from('sales')
    .select('id, total_value, original_price, down_payment, origin_type, device_model_manual, created_at, repassed_at, installments_count, customers(name)')
    .is('repassed_at', null);

  if (error) console.error("Error:", error);
  console.log(`Total de vendas sem repasse: ${sales?.length || 0}`);

  (sales || []).forEach(s => {
    console.log(`- ID: ${s.id} | Cliente: ${s.customers?.name} | OriginalPrice: ${s.original_price} | TotalValue: ${s.total_value} | Down: ${s.down_payment} | Origin: ${s.origin_type} | Device: ${s.device_model_manual} | Created: ${s.created_at}`);
  });
}

run().catch(console.error);
