import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugInstallments() {
  console.log('--- DB INVESTIGATION: Paid Installments & Sales ---');
  
  const { data: installments, error } = await supabase
    .from('installments')
    .select('id, value, status, origin_type, payment_method, payment_date, created_at, repassed_at, sale_id, sales(id, origin_type, store_id, device_model, total_installments)')
    .eq('status', 'paid');

  if (error) {
    console.error('Error fetching paid installments:', error);
    return;
  }

  console.log(`Total paid installments found: ${installments?.length || 0}`);
  
  if (installments && installments.length > 0) {
    installments.slice(0, 10).forEach((inst: any, idx: number) => {
      const sale: any = inst.sales;
      console.log(`[${idx+1}] ID: ${inst.id} | Val: R$ ${inst.value} | Inst.Origin: ${inst.origin_type} | Sale.Origin: ${sale?.origin_type} | Device: ${sale?.device_model} | Repassed: ${inst.repassed_at}`);
    });
  } else {
    // Se não tiver status 'paid', verificar os outros status
    const { data: allInsts } = await supabase
      .from('installments')
      .select('id, status, value')
      .limit(10);
    console.log('Sample installments (any status):', allInsts);
  }
}

debugInstallments();
