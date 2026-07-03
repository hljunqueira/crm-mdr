import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log("Connecting to:", supabaseUrl);
  console.log("Key length:", supabaseKey.length);

  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, full_name, role');
  console.log("PROFILES ERROR:", pErr);
  console.log("PROFILES COUNT:", profiles?.length);
  console.log("PROFILES:", profiles);

  const { data: wallets, error: wErr } = await supabase.from('wallets').select('*');
  console.log("WALLETS ERROR:", wErr);
  console.log("WALLETS COUNT:", wallets?.length);
  console.log("WALLETS:", wallets);

  const { data: txs, error: tErr } = await supabase.from('wallet_transactions').select('*');
  console.log("TRANSACTIONS ERROR:", tErr);
  console.log("TRANSACTIONS COUNT:", txs?.length);
  console.log("TRANSACTIONS:", txs);
}

main();
