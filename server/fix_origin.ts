import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAndFixOrigin() {
  console.log('--- INSPECTING CLIENTE BALCAO & ROBERT AVILA ---');
  
  // Buscar parcelas de Cliente Balcao ou Robert Avila
  const { data: insts, error } = await supabase
    .from('installments')
    .select('id, origin_type, installment_number, total_installments, value, sale_id, sales(id, origin_type, device_model, customers(name))');

  if (error) {
    console.error('Error fetching installments:', error);
    return;
  }

  const targets = (insts || []).filter((i: any) => {
    const name = i.sales?.customers?.name || '';
    const dev = i.sales?.device_model || '';
    return name.includes('BALCAO') || name.includes('ROBERT') || dev.includes('CABO') || dev.includes('TELA');
  });

  console.log('Found target installments:', targets);

  for (const t of targets) {
    console.log(`Updating installment ID ${t.id} to origin_type = 'CREDIARIO_LOJA'...`);
    const { error: updErr } = await supabase
      .from('installments')
      .update({ origin_type: 'CREDIARIO_LOJA' })
      .eq('id', t.id);
    
    if (updErr) {
      console.error(`Failed to update installment ${t.id}:`, updErr.message);
    } else {
      console.log(`Successfully updated installment ${t.id}`);
    }

    if (t.sale_id) {
      console.log(`Updating sale ID ${t.sale_id} to origin_type = 'CREDIARIO_LOJA'...`);
      await supabase
        .from('sales')
        .update({ origin_type: 'CREDIARIO_LOJA' })
        .eq('id', t.sale_id);
    }
  }
}

inspectAndFixOrigin();
