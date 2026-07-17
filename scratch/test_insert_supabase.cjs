const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const customer = {
    id: 'a8e3fdde-564b-41b4-9d20-a183b5e3c31a',
    name: 'Joares Jm',
    cpf: '',
    phone: '(48) 9967-0128',
    unit_id: 'b2b1f71d-0471-49a1-b151-865ccc3cd627',
    status: 'active'
  };
  
  const { data, error } = await supabase.from('customers').upsert(customer).select();
  console.log('Result:', data, 'Error:', error);
}
run();
