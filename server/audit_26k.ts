import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function audit26k() {
  console.log('=== AUDITORIA COMPLETA DE R$ 26.625,99 DO CARD DA LOJA ===\n');

  // 1. Entradas de TODAS as vendas cadastradas (sales.down_payment)
  const { data: allSales } = await supabase
    .from('sales')
    .select('id, down_payment, origin_type, device_model, customers(name)');

  let totalDownPayments = 0;
  console.log('--- ENTRADAS REGISTRADAS NAS VENDAS (sales.down_payment) ---');
  (allSales || []).forEach((s: any) => {
    const down = Number(s.down_payment || 0);
    const cust = Array.isArray(s.customers) ? s.customers[0] : s.customers;
    const custName = cust?.name || 'Balcão';
    if (down > 0) {
      totalDownPayments += down;
      console.log(`[ENTRADA VEM DA VENDA] Contrato #${s.id.slice(0, 8)} | Cliente: ${custName} | Aparelho: ${s.device_model || 'Item'} | Entrada: R$ ${down.toFixed(2)}`);
    }
  });

  console.log(`\nSUBTOTAL ENTRADAS DE VENDAS DA LOJA: R$ ${totalDownPayments.toFixed(2)}\n`);

  // 2. Parcelas pagas de 1 parcela única ou crediário loja acumulado
  const { data: paidInstallments } = await supabase
    .from('installments')
    .select('*, sales(*, customers(*))')
    .or('status.eq.paid,status.eq.pago,payment_date.not.is.null');

  let totalLojaInstallments = 0;
  (paidInstallments || []).forEach((inst: any) => {
    const val = Number(inst.value || 0);
    const sale = Array.isArray(inst.sales) ? inst.sales[0] : inst.sales;
    const isSingleOrLoja = (inst.total_installments === 1) || inst.origin_type === 'CREDIARIO_LOJA' || sale?.origin_type === 'CREDIARIO_LOJA';

    if (isSingleOrLoja) {
      totalLojaInstallments += val;
    }
  });

  console.log(`SUBTOTAL PARCELAS DO CAIXA DA LOJA: R$ ${totalLojaInstallments.toFixed(2)}`);
  console.log(`=======================================================`);
  console.log(`SOMA TOTAL RETORNADA NO ENDPOINT DO CAIXA: R$ ${(totalDownPayments + totalLojaInstallments).toFixed(2)}`);
  console.log(`=======================================================\n`);
}

audit26k();
