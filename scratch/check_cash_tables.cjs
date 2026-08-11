const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: ct, error: e1 } = await supabase.from('cash_transactions').select('*').limit(3);
  console.log("cash_transactions:", ct, "err:", e1);

  const { data: ctr, error: e2 } = await supabase.from('cashier_transfers').select('*').limit(3);
  console.log("cashier_transfers:", ctr, "err:", e2);
}

run().catch(console.error);
