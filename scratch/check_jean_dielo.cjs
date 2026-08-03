const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJean() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .ilike('full_name', '%Jean%');
  
  console.log("Profiles matching Jean:", profiles);

  if (profiles && profiles.length > 0) {
    for (const p of profiles) {
      console.log(`\n=== Investor: ${p.full_name} (${p.id}) ===`);

      // Quotas / Lots
      const { data: quotas } = await supabase
        .from('investor_quotas')
        .select('*, lot:lots(*)')
        .eq('profile_id', p.id);
      console.log("Quotas:", quotas);

      // Prime Devices
      const { data: primeDevices } = await supabase
        .from('devices')
        .select('*')
        .eq('investor_id', p.id);
      console.log("Prime Devices count:", primeDevices ? primeDevices.length : 0);
      if (primeDevices && primeDevices.length > 0) {
        console.log("Prime Devices:", primeDevices.map(d => ({
          id: d.id, model: d.model, cost: d.cost_price, sale: d.sale_price,
          prime_profit_share_type: d.prime_profit_share_type
        })));
      }

      // Renda Purchases
      const { data: renda } = await supabase
        .from('receivable_purchases')
        .select('*')
        .eq('profile_id', p.id);
      console.log("Renda Purchases count:", renda ? renda.length : 0);

      // Wallet & Txs
      const { data: wallet } = await supabase.from('wallets').select('*').eq('profile_id', p.id);
      console.log("Wallet:", wallet);
      const { data: txs } = await supabase.from('wallet_transactions').select('*').eq('profile_id', p.id);
      console.log("Wallet Txs count:", txs ? txs.length : 0);
      if (txs && txs.length > 0) console.log("Wallet Txs:", txs);
    }
  }
}

checkJean();
