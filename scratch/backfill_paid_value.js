import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching paid installments...');
  const { data: installments, error: fetchErr } = await supabase
    .from('installments')
    .select('id, value')
    .eq('status', 'paid')
    .is('paid_value', null);

  if (fetchErr) {
    console.error('Fetch Error:', fetchErr);
    return;
  }

  console.log(`Found ${installments.length} installments to update.`);

  for (const inst of installments) {
    const { error: updateErr } = await supabase
      .from('installments')
      .update({ paid_value: inst.value })
      .eq('id', inst.id);

    if (updateErr) {
      console.error(`Error updating installment ${inst.id}:`, updateErr);
    } else {
      console.log(`Updated installment ${inst.id} with paid_value = ${inst.value}`);
    }
  }

  console.log('Finished backfilling!');
}

run();
