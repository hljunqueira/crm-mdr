import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const customerId = '8f31d771-d25b-4b44-8666-adc57c359fca'; // Maykon da Rosa
  
  // Find sales for this customer
  const { data: sales, error: sErr } = await supabase
    .from('sales')
    .select('*')
    .eq('customer_id', customerId);

  if (sErr) console.error('Error fetching sales:', sErr);
  else console.log(`Found ${sales.length} sales for Maykon da Rosa:`, sales.map(s => s.id));

  // Find installments for these sales
  if (sales.length > 0) {
    const saleIds = sales.map(s => s.id);
    const { data: installments, error: iErr } = await supabase
      .from('installments')
      .select('*')
      .in('sale_id', saleIds);
      
    if (iErr) console.error('Error fetching installments:', iErr);
    else {
      console.log(`Found ${installments.length} installments:`);
      for (const inst of installments) {
        console.log(`ID: ${inst.id} | Sale ID: ${inst.sale_id} | Status: ${inst.status} | Value: ${inst.amount} | Due: ${inst.due_date}`);
      }
    }
  }
}

run();
