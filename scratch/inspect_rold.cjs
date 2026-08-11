const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: insts } = await supabase.from('installments').select('*').limit(3);
  const targetId = insts[0].id;

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
          name,
          phone
        )
      )
    `)
    .eq("id", targetId)
    .single();

  console.log("rOld Data:", JSON.stringify(rOld, null, 2));
}

run().catch(console.error);
