import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMatch() {
  const { data: paidInstallments } = await supabase
    .from('installments')
    .select('id, status, value, origin_type, payment_method, payment_date, created_at, installment_number, total_installments, sales(id, origin_type, store_id, down_payment, payment_type, payment_method, customer_id, customers(id, name, cpf)))')
    .or('status.eq.paid,status.eq.pago,payment_date.not.is.null');

  let totalBackendCaixa = 0;
  let totalFrontendRecebiveis = 0;

  (paidInstallments || []).forEach((inst: any) => {
    const val = Number(inst.value || 0);
    const sale = Array.isArray(inst.sales) ? inst.sales[0] : inst.sales;

    const isSingleOrLoja = (inst.total_installments === 1) || inst.origin_type === 'CREDIARIO_LOJA' || sale?.origin_type === 'CREDIARIO_LOJA';
    if (isSingleOrLoja) return;

    const isDownPaymentInst = inst.installment_number === 0 || inst.is_down_payment === true || (inst.installment_number === 1 && sale?.down_payment > 0 && Number(inst.value) === Number(sale.down_payment));
    if (isDownPaymentInst) return;

    const isFinanc = inst.origin_type === 'FINANCIAMENTO_CELULAR' || sale?.origin_type === 'FINANCIAMENTO_CELULAR' || (inst.total_installments && inst.total_installments > 1 && inst.origin_type !== 'CREDIARIO_LOJA');

    if (isFinanc) {
      totalBackendCaixa += val;
    }
  });

  (paidInstallments || []).forEach((inst: any) => {
    const sale = Array.isArray(inst.sales) ? inst.sales[0] : inst.sales;
    const isFinanc = inst.origin_type === 'FINANCIAMENTO_CELULAR' || sale?.origin_type === 'FINANCIAMENTO_CELULAR';
    const isCrediarioLoja = inst.origin_type === 'CREDIARIO_LOJA' || sale?.origin_type === 'CREDIARIO_LOJA';

    const totalInsts = inst.total_installments || sale?.installments || 1;
    const isSingle = totalInsts === 1;
    const isDownPayment = inst.installment_number === 0 || (inst as any).is_down_payment === true || (inst.installment_number === 1 && (sale?.down_payment > 0 || inst.down_payment > 0) && Number(inst.value) === Number(sale?.down_payment || inst.down_payment));

    if (isFinanc && !isCrediarioLoja && !isSingle && !isDownPayment) {
      totalFrontendRecebiveis += Number(inst.value || 0);
    }
  });

  console.log(`Backend Caixa Total: R$ ${totalBackendCaixa.toFixed(2)}`);
  console.log(`Frontend Recebiveis Total: R$ ${totalFrontendRecebiveis.toFixed(2)}`);
  console.log(`Discrepancia: R$ ${(totalFrontendRecebiveis - totalBackendCaixa).toFixed(2)}`);
}

testMatch();
