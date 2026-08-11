const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== TESTANDO CONSULTA DE PARCELA SEM TABELA 'STORES' ===");

  const { data: inst } = await supabase.from('installments').select('id, customer_name, sale_id').limit(1).single();

  if (inst) {
    // Query antiga (com stores)
    const { data: rOld, error: eOld } = await supabase
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

    console.log("Query Antiga (com stores) -> Error:", eOld?.message);

    // Query Nova (com units)
    const { data: rNew, error: eNew } = await supabase
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
          units:units (
            name
          )
        )
      `)
      .eq("id", inst.id)
      .single();

    console.log("Query Nova (com units) -> Success! Customer:", rNew?.sales?.customer?.name, "Unit:", rNew?.sales?.units?.name);
  }
}

run().catch(console.error);
