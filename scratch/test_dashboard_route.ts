import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);
const profile_id = '58b015a7-9277-4b6d-bb94-4bc95dc55bbd';

async function run() {
  console.log('Testing dashboard endpoint steps...');
  
  try {
    console.log('1. Fetching wallet...');
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("balance, future_receipts")
      .eq("profile_id", profile_id)
      .maybeSingle();
    if (walletError) throw walletError;
    console.log('Wallet fetched:', wallet);

    console.log('2. Fetching quotas...');
    const { data: quotas, error: quotasError } = await supabase
      .from("investor_quotas")
      .select(`
        id,
        amount_invested,
        ownership_percentage,
        interest_sharing_percentage,
        contract_url,
        signed_contract_at,
        lot:lots (
          id,
          title,
          target_amount,
          status
        )
      `)
      .eq("profile_id", profile_id);
    if (quotasError) throw quotasError;
    console.log('Quotas fetched:', quotas?.length);

    console.log('3. Fetching wallet transactions...');
    const { data: allTransactions, error: txsErr } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("profile_id", profile_id);
    if (txsErr) throw txsErr;
    console.log('Wallet transactions fetched:', allTransactions?.length);

    console.log('4. Fetching prime devices...');
    const { data: primeDevices, error: primeErr } = await supabase
      .from("devices")
      .select("id, brand, model, imei, status, cost_price, prime_profit_share, prime_admin_fee")
      .eq("investor_id", profile_id);
    if (primeErr) throw primeErr;
    console.log('Prime devices fetched:', primeDevices?.length);

    console.log('5. Fetching receivable purchases...');
    const { data: rendaPurchases, error: rendaErr } = await supabase
      .from("receivable_purchases")
      .select(`
        *,
        sale:sales (
          id,
          total_value,
          customer:customers (name),
          device:devices (brand, model, imei)
        )
      `)
      .eq("profile_id", profile_id);
    if (rendaErr) throw rendaErr;
    console.log('Receivable purchases fetched:', rendaPurchases?.length);

    console.log('All steps completed successfully!');
  } catch (err: any) {
    console.error('Error encountered in step-by-step test:', err);
  }
}

run();
