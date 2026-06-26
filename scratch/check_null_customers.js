import { supabase } from '../server/lib/supabase.js';

async function run() {
  const storeId = 'b2b1f71d-0471-49a1-b151-865ccc3cd627';
  
  const { data: nullCpfCusts, error: err1 } = await supabase
    .from('customers')
    .select('id, name, cpf, phone')
    .eq('unit_id', storeId)
    .is('cpf', null);

  console.log("Customers with NULL CPF:", nullCpfCusts?.length, err1 || '');
  if (nullCpfCusts && nullCpfCusts.length > 0) {
    console.log(nullCpfCusts.slice(0, 5));
  }

  const { data: nullPhoneCusts, error: err2 } = await supabase
    .from('customers')
    .select('id, name, cpf, phone')
    .eq('unit_id', storeId)
    .is('phone', null);

  console.log("Customers with NULL Phone:", nullPhoneCusts?.length, err2 || '');
  if (nullPhoneCusts && nullPhoneCusts.length > 0) {
    console.log(nullPhoneCusts.slice(0, 5));
  }
}

run();
