import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const profileId = '456c7a87-fe55-4a53-aee0-b7072e5f39ef'; // Jean Carlos da Rosa
  
  // 1. Get Wallet
  const { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();
  
  console.log('Wallet Info:', wallet);

  // 2. Get all transactions
  const { data: txs } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  console.log('\n--- Wallet Transactions ---');
  let sumAmount = 0;
  if (txs) {
    txs.forEach((t, i) => {
      console.log(`[${i+1}] Date: ${t.created_at} | Type: ${t.type} | Amount: R$ ${t.amount} | Desc: ${t.description}`);
      if (t.type === 'WITHDRAWAL') {
        sumAmount -= Number(t.amount);
      } else {
        sumAmount += Number(t.amount);
      }
    });
  }
  
  console.log('\nSum of Transactions:', sumAmount);
}

run().catch(console.error);
