import { supabase } from '../server/lib/supabase.js';

async function run() {
  // Query table structure
  const { data: cols, error: colErr } = await supabase.rpc('get_table_info', { table_name: 'customers' });
  if (colErr) {
    // If helper RPC doesn't exist, we can query using a general SQL run or just query the information_schema via standard SQL
    console.error("Error calling get_table_info:", colErr);
  }

  // Let's run a query on pg_indexes to see the indexes on the customers table
  const { data: indexes, error: idxErr } = await supabase
    .from('customers')
    .select('id')
    .limit(1); // just checking access

  // Let's run an arbitrary SQL query if possible, or query using supabase query builder
  // We can query pg_catalog tables via supabase if RLS allows, but usually RLS blocks direct system catalog tables for anonymous/authenticated roles.
  // However, since we are using supabase client which has Service Role Key if it's configured, let's see if we can query pg_indexes.
  
  const { data: pgIndexes, error: pgIdxErr } = await supabase
    .rpc('exec_sql', { sql_query: "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'customers';" });
  
  if (pgIdxErr) {
    console.log("exec_sql RPC not available, let's try direct information_schema queries via postgrest if possible...");
  } else {
    console.log("Indexes on customers:", pgIndexes);
  }
  
  // Let's check table columns by executing a query on information_schema.columns
  const { data: columnsInfo, error: colsInfoErr } = await supabase
    .rpc('exec_sql', { sql_query: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'customers';" });
  
  if (!colsInfoErr) {
    console.log("Columns of customers:", columnsInfo);
  } else {
    // Fallback: Let's fetch one record and see its keys
    const { data: oneCustomer } = await supabase.from('customers').select('*').limit(1).single();
    if (oneCustomer) {
      console.log("Keys on customer record:", Object.keys(oneCustomer));
    }
  }
}

run();
