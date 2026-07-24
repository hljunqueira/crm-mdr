const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: profiles } = await supabase.from('profiles').select('id, full_name, role').ilike('full_name', '%Roberto%');
  console.log("Profiles matching Roberto:", profiles);

  if (profiles && profiles.length > 0) {
    const robertoId = profiles[0].id;

    const { data: wallet } = await supabase.from('wallets').select('*').eq('profile_id', robertoId);
    console.log("Wallet:", wallet);

    const { data: txs } = await supabase.from('wallet_transactions').select('*').eq('profile_id', robertoId).order('created_at', { ascending: false });
    console.log("Wallet Transactions count:", txs ? txs.length : 0);
    console.log("Wallet Transactions:", txs);
  }
}

check();
