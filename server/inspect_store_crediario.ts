import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectStoreCrediarioStrict() {
  console.log('=== FILTRO ESTRITO DE CREDIÁRIO LOJA (APENAS PARCELAMENTO DE CREDIÁRIO PRÓPRIO) ===\n');

  const { data: installments } = await supabase
    .from('installments')
    .select('*, sales(*, customers(*))');

  const strictCrediarioInsts = (installments || []).filter(inst => {
    const sale = inst.sales;
    const isFinanc = inst.origin_type === 'FINANCIAMENTO_CELULAR' || sale?.origin_type === 'FINANCIAMENTO_CELULAR';
    if (isFinanc) return false;

    const pm = (inst.payment_method || sale?.payment_method || '').toLowerCase();
    const pt = (sale?.payment_type || '').toLowerCase();
    const isCardOrVista = pt === 'vista' || pt === 'card' || pt === 'debit' || pm === 'card' || pm === 'debit';
    if (isCardOrVista) return false;

    const totalInsts = inst.total_installments || sale?.installments || 1;
    if (totalInsts <= 1) return false;

    const isDownPayment = inst.installment_number === 0 || inst.is_down_payment === true;
    if (isDownPayment) return false;

    return true;
  });

  console.log(`Total de parcelas do Crediário Loja Estrito: ${strictCrediarioInsts.length}`);

  let totalPago = 0;
  let totalPendente = 0;
  let totalAtrasado = 0;

  strictCrediarioInsts.forEach(inst => {
    const sale = inst.sales;
    const custName = sale?.customers?.name || 'Cliente';
    const val = Number(inst.value || 0);

    if (inst.status === 'paid' || inst.status === 'pago') {
      totalPago += val;
    } else if (inst.status === 'overdue') {
      totalAtrasado += val;
      totalPendente += val;
    } else {
      totalPendente += val;
    }

    console.log(`[CREDIÁRIO ESTRITO] Cliente: ${custName} | Item: ${sale?.device_model || 'Produto'} | Parcela: ${inst.installment_number}/${inst.total_installments} | Valor: R$ ${val} | Status: ${inst.status}`);
  });

  console.log('\n========================================');
  console.log(`TOTAL A RECEBER (PENDENTE): R$ ${totalPendente.toFixed(2)}`);
  console.log(`RECEBIDO (TOTAL PAGO):      R$ ${totalPago.toFixed(2)}`);
  console.log(`EM ATRASO:                  R$ ${totalAtrasado.toFixed(2)}`);
  console.log('========================================\n');
}

inspectStoreCrediarioStrict();
