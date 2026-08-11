const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: sales, error } = await supabase.from('sales').select('*').limit(3);
  console.log("Sales sample:", sales);
  if (sales && sales.length > 0) {
    console.log("Sales columns:", Object.keys(sales[0]));
  }
}

run().catch(console.error);
