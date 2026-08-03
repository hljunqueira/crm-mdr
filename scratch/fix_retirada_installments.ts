import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function fixRetiradaInstallments() {
  console.log('=== FIXING RETIRADA INSTALLMENTS FROM TODAY ===');

  const saleIds = [
    '69fd328e-e345-45b7-b54e-3f2a692f65a3', // tela lg k22 (R$ 290)
    'ff715349-759e-4fb5-835e-07570def4069'  // assistencia tecnica (R$ 100)
  ];

  for (const saleId of saleIds) {
    const { data: sale } = await supabase.from('sales').select('total_value, payment_method').eq('id', saleId).single();
    if (sale) {
      console.log(`Updating installments for sale ${saleId}...`);
      const { data: insts, error } = await supabase
        .from('installments')
        .update({
          status: 'paid',
          payment_date: '2026-07-31',
          payment_method: sale.payment_method || 'pix',
          paid_value: sale.total_value,
          origin_type: 'CREDIARIO_LOJA'
        })
        .eq('sale_id', saleId)
        .select();

      if (error) {
        console.error(`Error updating installments for ${saleId}:`, error);
      } else {
        console.log(`Updated installments for sale ${saleId}:`, insts);
      }
    }
  }

  console.log('=== FIX COMPLETE ===');
}

fixRetiradaInstallments();
