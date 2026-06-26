import { supabase } from '../server/lib/supabase.js';

async function run() {
  const storeId = 'b2b1f71d-0471-49a1-b151-865ccc3cd627';
  
  // Fetch a few customers from this unit
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('unit_id', storeId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching customers:", error);
    return;
  }

  console.log(`Found ${customers.length} recent customers for Arthur's store:`);
  customers.forEach(c => {
    console.log(`- ID: ${c.id}, Name: ${c.name}, CPF: "${c.cpf}", Phone: "${c.phone}", Created: ${c.created_at}`);
  });

  // Let's count total customers for this store
  const { count, error: countErr } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('unit_id', storeId);

  console.log("Total customers in store:", count);
}

run();
