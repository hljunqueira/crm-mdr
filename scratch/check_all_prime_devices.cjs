const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== EXECUTANDO A QUERY DO FETCHPRIMEDEVICES (ScpManagement.tsx) ===");

  const { data, error } = await supabase
    .from('devices')
    .select('*, profiles:investor_id(full_name)')
    .not('investor_id', 'is', null);

  if (error) console.error("Error:", error);
  console.log(`Retornados ${data?.length || 0} dispositivos com investor_id != null:`);
  
  (data || []).forEach(d => {
    console.log(`- ID: ${d.id} | Model: ${d.brand} ${d.model} | IMEI: ${d.imei} | Status: ${d.status} | StockQty: ${d.stock_quantity} | Investor: ${d.profiles?.full_name} (${d.investor_id})`);
  });
}

run().catch(console.error);
