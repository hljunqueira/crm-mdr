import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { processScpInstallmentPayout } from '../server/routes/scp_payout_trigger';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const profileId = '456c7a87-fe55-4a53-aee0-b7072e5f39ef'; // Jean Carlos
  const inst16 = '41e9bb0f-2f35-486c-bdaf-a055450539fc';
  const inst13 = 'b788850d-248e-4f7e-aa6d-aacc3caad899';

  console.log('--- Cleaning up incorrect transactions ---');
  // Delete existing transactions for these installments
  const { error: delErr } = await supabase
    .from('wallet_transactions')
    .delete()
    .in('installment_id', [inst16, inst13]);

  if (delErr) {
    console.error('Error deleting transactions:', delErr);
    return;
  }
  console.log('Incorrect transactions deleted successfully.');

  console.log('--- Resetting wallet balance to R$ 0.00 ---');
  const { error: resetErr } = await supabase
    .from('wallets')
    .update({ balance: 0, future_receipts: 0 })
    .eq('profile_id', profileId);

  if (resetErr) {
    console.error('Error resetting wallet balance:', resetErr);
    return;
  }
  console.log('Wallet balance reset successfully.');

  console.log('\n--- Processing payouts with correct code ---');
  console.log('Processing iPhone 16 payout (Value: R$ 4450)...');
  await processScpInstallmentPayout(inst16, 4450);

  console.log('Processing iPhone 13 payout (Value: R$ 3950)...');
  await processScpInstallmentPayout(inst13, 3950);

  console.log('\n--- Verification ---');
  const { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('profile_id', profileId)
    .single();
  console.log('New Wallet State:', wallet);

  const { data: txs } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('profile_id', profileId);
  console.log('New Transactions:', txs);
}

run().catch(console.error);
