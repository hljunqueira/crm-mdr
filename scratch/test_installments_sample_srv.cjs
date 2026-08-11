const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: insts, error: e1 } = await supabase.from('installments').select('*').limit(3);
  console.log("Installments sample count:", insts?.length, "Error:", e1);

  if (insts && insts.length > 0) {
    const targetId = insts[0].id;
    console.log("Target installment ID:", targetId);

    // 1. Query Antiga (com store:stores)
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

    console.log("Query Antiga (com stores) -> Error:", eOld);

    // 2. Query Nova (com store:units)
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
          store:units (
            name
          )
        )
      `)
      .eq("id", targetId)
      .single();

    console.log("Query Nova (com units) -> Success! Error:", eNew, "Customer:", rNew?.sales?.customer?.name, "Unit:", rNew?.sales?.store?.name);
  }
}

run().catch(console.error);
