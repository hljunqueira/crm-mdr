import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSummaryEndpoint() {
  // Let's execute the exact logic inside cashier.ts
  const now = new Date();

  const { data: paidInstallments } = await supabase
    .from('installments')
    .select('id, status, value, origin_type, payment_method, payment_date, created_at, installment_number, total_installments, sales(id, origin_type, store_id, down_payment, payment_type, payment_method, customer_id, customers(id, name, cpf)))')
    .or('status.eq.paid,status.eq.pago,payment_date.not.is.null');

  let totalLojaInstallments = 0;
  let totalFinanceiraInstallments = 0;

  (paidInstallments || []).forEach((inst: any) => {
    const val = Number(inst.value) || 0;
    const sale = Array.isArray(inst.sales) ? inst.sales[0] : inst.sales;
    const isCard = inst.payment_method === 'card' || inst.payment_method === 'debit' || sale?.payment_type === 'card' || sale?.payment_type === 'debit';

    const isSingleOrLoja = (inst.total_installments === 1) || inst.origin_type === 'CREDIARIO_LOJA' || sale?.origin_type === 'CREDIARIO_LOJA';
    if (isSingleOrLoja) {
      totalLojaInstallments += val;
      return;
    }

    const isDownPaymentInst = inst.installment_number === 0 || inst.is_down_payment === true || (inst.installment_number === 1 && sale?.down_payment > 0 && Number(inst.value) === Number(sale.down_payment));
    if (isDownPaymentInst) {
      totalLojaInstallments += val;
      return;
    }

    totalFinanceiraInstallments += val;
  });

  const { data: salesData } = await supabase
    .from('sales')
    .select('down_payment, origin_type, store_id');

  let totalLojaDownPayments = 0;
  (salesData || []).forEach((sale: any) => {
    const down = Number(sale.down_payment) || 0;
    totalLojaDownPayments += down;
  });

  console.log(`totalLojaInstallments: ${totalLojaInstallments}`);
  console.log(`totalLojaDownPayments: ${totalLojaDownPayments}`);
  console.log(`Soma do card Entradas Diretas: ${totalLojaInstallments + totalLojaDownPayments}`);
}

testSummaryEndpoint();
