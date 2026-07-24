const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
  console.log("Cleaning AMORTIZATION transactions from wallet_transactions table...");
  
  const { data: toDelete, error: selectErr } = await supabase
    .from('wallet_transactions')
    .select('id, profile_id, amount, description, created_at')
    .eq('type', 'AMORTIZATION');

  if (selectErr) {
    console.error("Error selecting AMORTIZATION transactions:", selectErr);
    return;
  }

  console.log(`Found ${toDelete ? toDelete.length : 0} AMORTIZATION records to clean:`, toDelete);

  if (toDelete && toDelete.length > 0) {
    const ids = toDelete.map(t => t.id);
    const { error: delErr } = await supabase
      .from('wallet_transactions')
      .delete()
      .in('id', ids);

    if (delErr) {
      console.error("Error deleting AMORTIZATION records:", delErr);
    } else {
      console.log(`Successfully deleted ${ids.length} AMORTIZATION records from wallet_transactions!`);
    }
  } else {
    console.log("No AMORTIZATION records found to delete.");
  }
}

clean();
