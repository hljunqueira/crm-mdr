import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase configuration missing.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching all sales...');
  const { data: sales, error } = await supabase
    .from('sales')
    .select('id, sale_date, created_at');

  if (error) {
    console.error('Error fetching sales:', error);
    return;
  }

  console.log(`Found ${sales.length} sales. Analyzing dates...`);

  let updateCount = 0;

  for (const sale of sales) {
    if (!sale.created_at) continue;

    const createdAtDate = sale.created_at.split('T')[0];
    if (sale.sale_date !== createdAtDate) {
      console.log(`Sale ID: ${sale.id} | Current Date: ${sale.sale_date} -> Correct Date (CreatedAt): ${createdAtDate}`);
      
      const { error: updateError } = await supabase
        .from('sales')
        .update({ sale_date: createdAtDate })
        .eq('id', sale.id);

      if (updateError) {
        console.error(`Error updating sale ${sale.id}:`, updateError);
      } else {
        updateCount++;
      }
    }
  }

  console.log(`\nSuccessfully updated ${updateCount} historical sales.`);
}

run();
