const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== TESTANDO CONSULTA DE PARCELA PARA COBRANÇA EM BILLING.TS ===");

  const { data: inst } = await supabase.from('installments').select('id, customer_name, sale_id').limit(1).single();
  console.log("Sample installment:", inst);

  if (inst) {
    const { data: result, error } = await supabase
      .from("installments")
      .select(`
        *,
        sales (
          device_model_manual,
          imei_manual,
          customer:customers (
            name,
            phone
          )
        )
      `)
      .eq("id", inst.id)
      .single();

    console.log("Query result with sales & customers:", result, "Error:", error);

    // Now test with store:stores
    const { data: r2, error: e2 } = await supabase
      .from("installments")
      .select(`
        *,
        sales (
          device_model_manual,
          imei_manual,
          customer:customers (
            name,
            phone
          ),
          store:stores (
            name
          )
        )
      `)
      .eq("id", inst.id)
      .single();

    console.log("Query result with stores:", r2, "Error with stores:", e2);
  }
}

run().catch(console.error);
