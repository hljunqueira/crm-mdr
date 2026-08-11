const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: insts } = await supabase.from('installments').select('id, customer_name, sale_id').limit(5);
  console.log("Installments sample:", insts);

  if (insts && insts.length > 0) {
    const targetId = insts[0].id;
    
    // 1. Query Antiga (stores)
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
      .eq("id", targetId)
      .single();

    console.log("Query Antiga (com stores) -> Error:", eOld?.message);

    // 2. Query Nova (units)
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
      .eq("id", targetId)
      .single();

    console.log("Query Nova (com units) -> Success! Customer:", rNew?.sales?.customer?.name, "Unit:", rNew?.sales?.units?.name);
  }
}

run().catch(console.error);
