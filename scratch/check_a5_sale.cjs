const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const deviceId = '09b8c9a6-6278-4312-9abb-0dfe6ab5f449';
  console.log("Searching sales for device_id:", deviceId);

  const { data: sales } = await supabase.from('sales').select('*, customers(name)').eq('device_id', deviceId);
  console.log("Sales found:", sales);

  // Also check if any sales record has IMEI 860993083018221 in notes or description
  const { data: allSales } = await supabase.from('sales').select('id, device_id, device_model_manual, created_at, customers(name)');
  const matchingSale = (allSales || []).filter(s => JSON.stringify(s).includes('860993083018221') || JSON.stringify(s).includes('redmi a5'));
  console.log("Matching sales by text:", matchingSale);
}

run().catch(console.error);
