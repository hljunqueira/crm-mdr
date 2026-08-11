import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFullFinancAudit() {
  console.log('=== AUDITORIA COMPLETA DE FINANCIAMENTO DE CELULARES NO SUPABASE ===\n');

  // 1. Buscar TODAS as vendas com seus clientes e parcelas
  const { data: sales, error: salesErr } = await supabase
    .from('sales')
    .select('*, customers(*), installments(*)');

  if (salesErr) {
    console.error('Erro ao buscar vendas:', salesErr);
    return;
  }

  console.log(`Total de vendas no banco: ${sales?.length}`);

  // Vendas identificadas como Financiamento Celular
  const financSales = (sales || []).filter(s => {
    const isExplicitFinanc = s.origin_type === 'FINANCIAMENTO_CELULAR';
    const isDeviceSaleWithInstallments = (s.device_id || s.device_model || s.device_model_manual) && s.installments?.length > 1;
    return isExplicitFinanc || isDeviceSaleWithInstallments;
  });

  console.log(`Total de contratos de Financiamento Celular (MDM): ${financSales.length}\n`);

  let totalContratosGeral = 0;
  let totalAReceberGeral = 0;
  let totalRecebidoGeral = 0;
  let totalAtrasadoGeral = 0;
  let totalEntradasGeral = 0;

  financSales.forEach((s, idx) => {
    const custName = s.customers?.name || 'Cliente Sem Nome';
    const device = s.device_model || s.device_model_manual || 'Smartphone';
    const downPayment = Number(s.down_payment || 0);
    totalEntradasGeral += downPayment;

    const insts = s.installments || [];
    let salePaid = 0;
    let salePending = 0;
    let saleOverdue = 0;

    insts.forEach((inst: any) => {
      const val = Number(inst.value || 0);
      const isDownPaymentInst = inst.installment_number === 0 || inst.is_down_payment === true || (inst.installment_number === 1 && downPayment > 0 && Number(val) === Number(downPayment));

      if (isDownPaymentInst) {
        // Entrada pertence à loja física
        return;
      }

      if (inst.status === 'paid' || inst.status === 'pago') {
        salePaid += val;
      } else if (inst.status === 'overdue') {
        saleOverdue += val;
        salePending += val;
      } else {
        salePending += val;
      }
    });

    const totalSaleContract = salePaid + salePending;
    totalContratosGeral += totalSaleContract;
    totalAReceberGeral += salePending;
    totalRecebidoGeral += salePaid;
    totalAtrasadoGeral += saleOverdue;

    console.log(`[${idx + 1}] Contrato #${s.id.slice(0, 8)} | Cliente: ${custName} | Aparelho: ${device}`);
    console.log(`    Entrada Loja: R$ ${downPayment.toFixed(2)} | Total Financiado: R$ ${totalSaleContract.toFixed(2)} | Pago Fin: R$ ${salePaid.toFixed(2)} | Pendente: R$ ${salePending.toFixed(2)} (Atrasado: R$ ${saleOverdue.toFixed(2)})`);
  });

  console.log('\n======================================================');
  console.log('RESUMO CONSOLIDADO FINANCEIRA (FINANCIAMENTO CELULAR):');
  console.log(`- TOTAL DA CARTEIRA FINANCIADA: R$ ${totalContratosGeral.toFixed(2)}`);
  console.log(`- TOTAL A RECEBER (PENDENTE):   R$ ${totalAReceberGeral.toFixed(2)}`);
  console.log(`- RECEBIDO (TOTAL PAGO):        R$ ${totalRecebidoGeral.toFixed(2)}`);
  console.log(`- EM ATRASO (VENCIDO):          R$ ${totalAtrasadoGeral.toFixed(2)}`);
  console.log(`- ENTRADAS DA LOJA (DEDUZIDAS): R$ ${totalEntradasGeral.toFixed(2)}`);
  console.log('======================================================\n');

  // 2. Verificar se existem parcelas com origin_type solto ou sem venda associada
  const { data: allInstallments } = await supabase
    .from('installments')
    .select('*, sales(*)');

  const unlinkedFinancInsts = (allInstallments || []).filter(inst => {
    const isFinanc = inst.origin_type === 'FINANCIAMENTO_CELULAR' || inst.sales?.origin_type === 'FINANCIAMENTO_CELULAR';
    return isFinanc && !financSales.some(s => s.id === inst.sale_id);
  });

  if (unlinkedFinancInsts.length > 0) {
    console.warn(`⚠️ ATENÇÃO: Encontradas ${unlinkedFinancInsts.length} parcelas de financiamento sem venda correspondente na lista!`);
    unlinkedFinancInsts.forEach(i => {
      console.warn(`   Parcela ID: ${i.id} | Valor: R$ ${i.value} | Status: ${i.status} | Sale ID: ${i.sale_id}`);
    });
  } else {
    console.log('✅ Nenhuma parcela de financiamento órfã ou não mapeada foi encontrada.');
  }
}

runFullFinancAudit();
