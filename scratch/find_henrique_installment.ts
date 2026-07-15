import { supabase } from '../server/lib/supabase.js';

async function run() {
  const { data, error } = await supabase
    .from('installments')
    .select('id, installment_number, value, status, due_date, sales!inner(customer:customers!inner(name))')
    .eq('status', 'paid')
    .ilike('sales.customer.name', '%Henrique%')
    .order('due_date', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
