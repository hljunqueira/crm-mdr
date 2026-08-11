import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function find462() {
  const { data: sales } = await supabase
    .from('sales')
    .select('*, customers(*), installments(*)');

  const financSales = (sales || []).filter(s => {
    const isExplicitFinanc = s.origin_type === 'FINANCIAMENTO_CELULAR';
    const isDeviceSaleWithInstallments = (s.device_id || s.device_model || s.device_model_manual) && s.installments?.length > 1;
    return isExplicitFinanc || isDeviceSaleWithInstallments;
  });

  console.log('=== PARCELAS PAGAS DE FINANCIAMENTO NO BANCO ===');
  financSales.forEach(s => {
    const custName = s.customers?.name || 'Cliente Sem Nome';
    const downPayment = Number(s.down_payment || 0);

    (s.installments || []).forEach((inst: any) => {
      const isDownPaymentInst = inst.installment_number === 0 || inst.is_down_payment === true || (inst.installment_number === 1 && downPayment > 0 && Number(inst.value) === Number(downPayment));
      if (isDownPaymentInst) return;

      if (inst.status === 'paid' || inst.status === 'pago') {
        console.log(`Cliente: ${custName} | Parcela ${inst.installment_number}/${inst.total_installments} | Valor: R$ ${inst.value} | Payment Method: ${inst.payment_method} | ID: ${inst.id}`);
      }
    });
  });
}

find462();
