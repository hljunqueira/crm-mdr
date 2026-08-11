import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fullAudit() {
  console.log('====================================================');
  console.log(' AUDITORIA COMPLETA DE DADOS: BANCO SUPABASE DE CAIXAS');
  console.log('====================================================\n');

  // 1. Contagem geral de parcelas por status e origin_type
  const { data: allInsts, error: errInst } = await supabase
    .from('installments')
    .select('id, status, value, origin_type, installment_number, total_installments, repassed_at, sale_id, sales(id, origin_type, down_payment, status)');

  if (errInst) {
    console.error('Erro ao consultar parcelas:', errInst);
    return;
  }

  console.log(`1. TOTAL DE PARCELAS NO BANCO: ${allInsts?.length || 0}`);
  
  const paidInsts = (allInsts || []).filter((i: any) => i.status === 'paid');
  console.log(`   - Parcelas com status 'paid': ${paidInsts.length}`);

  let finCount = 0;
  let finTotalVal = 0;
  let lojaCount = 0;
  let lojaTotalVal = 0;
  let downPaymentCount = 0;

  paidInsts.forEach((inst: any) => {
    const val = Number(inst.value) || 0;
    const isFinanc = inst.origin_type === 'FINANCIAMENTO_CELULAR' || inst.sales?.origin_type === 'FINANCIAMENTO_CELULAR';
    const isDownPayment = inst.installment_number === 0 || (inst.sales?.down_payment && Number(inst.sales.down_payment) > 0 && val === Number(inst.sales.down_payment));

    if (isDownPayment) {
      downPaymentCount++;
    } else if (isFinanc && inst.total_installments > 1) {
      finCount++;
      finTotalVal += val;
    } else {
      lojaCount++;
      lojaTotalVal += val;
    }
  });

  console.log(`\n2. DISCRIMINAÇÃO DAS PARCELAS PAGAS:`);
  console.log(`   - Financeira (Celulares MDM, Parc > 1): ${finCount} parcelas | Total R$ ${finTotalVal.toFixed(2)}`);
  console.log(`   - Entradas de Vendas (Loja Física): ${downPaymentCount} parcelas/entradas`);
  console.log(`   - Crediário Loja (Acessórios/Serviços): ${lojaCount} parcelas | Total R$ ${lojaTotalVal.toFixed(2)}`);

  // 2. Vendas concluídas e entradas
  const { data: sales, error: errSales } = await supabase
    .from('sales')
    .select('id, origin_type, down_payment, total_value, status');

  if (!errSales && sales) {
    const totalDown = sales.reduce((acc, s: any) => acc + (Number(s.down_payment) || 0), 0);
    console.log(`\n3. ENTREDAS DIREITAS DE VENDAS (sales.down_payment):`);
    console.log(`   - Total de Vendas Registradas: ${sales.length}`);
    console.log(`   - Soma Total de Entradas de Balcão (Loja): R$ ${totalDown.toFixed(2)}`);
  }

  // 3. Transações de Caixa e Repasses
  const { data: transfers } = await supabase.from('cashier_transfers').select('*');
  console.log(`\n4. HISTÓRICO DE REPASSES (cashier_transfers):`);
  console.log(`   - Total de Repasses Executados: ${transfers?.length || 0}`);
}

fullAudit();
