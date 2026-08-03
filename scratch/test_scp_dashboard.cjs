const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('supabaseUrl:', supabaseUrl ? 'OK' : 'MISSING');
console.log('anonKey:', anonKey ? 'OK' : 'MISSING');
console.log('serviceKey:', serviceKey ? 'OK' : 'MISSING');

async function testWithKey(keyName, keyVal) {
  const supabase = createClient(supabaseUrl, keyVal);
  const profile_id = 'a0f9800a-8af2-4fdf-9f32-92a34800f15a';

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance, future_receipts")
    .eq("profile_id", profile_id)
    .maybeSingle();

  const { data: txs } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("profile_id", profile_id);

  console.log(`[KEY: ${keyName}] Wallet:`, wallet, 'Transactions Count:', txs ? txs.length : 0);
}

async function run() {
  await testWithKey('ANON_KEY', anonKey);
  if (serviceKey) {
    await testWithKey('SERVICE_ROLE_KEY', serviceKey);
  }
}

run();
