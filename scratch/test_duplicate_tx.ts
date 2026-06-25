import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const realInstallmentId = '61b7e8ca-e507-48a8-93f7-b00e48c5be21';
  const dummyProfileId = '6d5fc41b-c190-4e1f-b254-bdfdfa021675'; // admin profile id from sample

  // Use a unique description to identify our test inserts
  const testAmortizationDesc = 'TEST_AMORTIZATION_DUP_CHECK';
  const testProfitDesc = 'TEST_PROFIT_DUP_CHECK';

  // Clean first just in case
  await supabase.from('wallet_transactions').delete().eq('description', testAmortizationDesc);
  await supabase.from('wallet_transactions').delete().eq('description', testProfitDesc);

  console.log('Inserting AMORTIZATION...');
  const res1 = await supabase.from('wallet_transactions').insert({
    profile_id: dummyProfileId,
    type: 'AMORTIZATION',
    amount: 10,
    description: testAmortizationDesc,
    installment_id: realInstallmentId
  });

  if (res1.error) {
    console.error('Error inserting AMORTIZATION:', res1.error);
  } else {
    console.log('AMORTIZATION inserted successfully.');
  }

  console.log('Inserting PROFIT...');
  const res2 = await supabase.from('wallet_transactions').insert({
    profile_id: dummyProfileId,
    type: 'PROFIT',
    amount: 5,
    description: testProfitDesc,
    installment_id: realInstallmentId
  });

  if (res2.error) {
    console.error('Error inserting PROFIT:', res2.error);
  } else {
    console.log('PROFIT inserted successfully.');
  }

  // Clean up
  await supabase.from('wallet_transactions').delete().eq('description', testAmortizationDesc);
  await supabase.from('wallet_transactions').delete().eq('description', testProfitDesc);
}

run();
