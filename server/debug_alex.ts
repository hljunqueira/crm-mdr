import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAlex() {
  console.log('--- DEBUG ALEX HARTMANN RECORDS ---');

  const { data: insts, error } = await supabase
    .from('installments')
    .select('*, sales(*, customers(*))');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const alexInsts = (insts || []).filter((i: any) => {
    const custName = i.sales?.customers?.name || i.customer_name || '';
    return custName.toLowerCase().includes('alex hartmann');
  });

  console.log(`Found ${alexInsts.length} installments for Alex Hartmann:`);
  alexInsts.forEach((inst: any, idx: number) => {
    console.log(`\n--- INSTALLMENT #${idx + 1} ---`);
    console.log(`ID: ${inst.id}`);
    console.log(`Installment Number: ${inst.installment_number}`);
    console.log(`Total Installments: ${inst.total_installments}`);
    console.log(`Value: ${inst.value}`);
    console.log(`Status: ${inst.status}`);
    console.log(`Origin Type Inst: ${inst.origin_type}`);
    console.log(`Origin Type Sale: ${inst.sales?.origin_type}`);
    console.log(`Sale Down Payment: ${inst.sales?.down_payment}`);
    console.log(`Sale Total Value: ${inst.sales?.total_value}`);
    console.log(`Sale Original Price: ${inst.sales?.original_price}`);
    console.log(`Is Down Payment flag: ${inst.is_down_payment}`);
    console.log(`Repassed At: ${inst.repassed_at}`);
  });
}

debugAlex();
