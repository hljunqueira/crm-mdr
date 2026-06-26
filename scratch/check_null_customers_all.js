import { supabase } from '../server/lib/supabase.js';

async function run() {
  const { data: nullCpfCusts, error: err1 } = await supabase
    .from('customers')
    .select('id, name, cpf, phone, unit_id')
    .is('cpf', null);

  console.log("Total Customers with NULL CPF in DB:", nullCpfCusts?.length, err1 || '');
  if (nullCpfCusts && nullCpfCusts.length > 0) {
    console.log(nullCpfCusts.slice(0, 5));
  }

  const { data: nullPhoneCusts, error: err2 } = await supabase
    .from('customers')
    .select('id, name, cpf, phone, unit_id')
    .is('phone', null);

  console.log("Total Customers with NULL Phone in DB:", nullPhoneCusts?.length, err2 || '');
  if (nullPhoneCusts && nullPhoneCusts.length > 0) {
    console.log(nullPhoneCusts.slice(0, 5));
  }
}

run();
