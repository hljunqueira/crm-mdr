import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testBatchCronEngine() {
  console.log('=== TESTE DE VALIDAÇÃO DA RÉGUA DE COBRANÇA EM LOTE ===');

  // 1. Fetch unpaid installments
  const { data: installments, error } = await supabase
    .from('installments')
    .select(`
      *,
      sales (
        customer:customers (name, phone)
      )
    `)
    .in('status', ['pending', 'overdue'])
    .limit(20);

  if (error || !installments) {
    console.error('Error fetching installments:', error);
    return;
  }

  const now = new Date();
  const brDateStr = new Date(now.getTime() - 3 * 3600 * 1000).toISOString().split('T')[0];
  const todayTimestamp = new Date(`${brDateStr}T12:00:00Z`).getTime();

  console.log(`Data Base de Hoje (GMT-3): ${brDateStr}`);
  console.log(`Total de Parcelas a Analisar: ${installments.length}\n`);

  let triggeredCount = 0;

  for (const inst of installments) {
    const dueTimestamp = new Date(`${inst.due_date}T12:00:00Z`).getTime();
    const diffDays = Math.round((dueTimestamp - todayTimestamp) / (1000 * 60 * 60 * 24));

    let templateTag = '';
    let isRuleTriggered = false;

    if (diffDays === 3) {
      isRuleTriggered = true;
      templateTag = 'pre_due_3 (3 dias antes)';
    } else if (diffDays === 2) {
      isRuleTriggered = true;
      templateTag = 'pre_due_2 (2 dias antes)';
    } else if (diffDays === 1) {
      isRuleTriggered = true;
      templateTag = 'pre_due_1 (1 dia antes - amanhã)';
    } else if (diffDays === 0) {
      isRuleTriggered = true;
      templateTag = 'due_today (vence hoje - fatura)';
    } else if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      if (daysOverdue % 2 === 0) {
        isRuleTriggered = true;
        templateTag = `overdue_${daysOverdue}d (atraso de ${daysOverdue} dias)`;
      }
    }

    const customerName = inst.sales?.customer?.name || 'Desconhecido';

    if (isRuleTriggered) {
      triggeredCount++;
      console.log(`✅ [DISPARO ACIONADO] Cliente: ${customerName} | Vencimento: ${inst.due_date} | Dif: ${diffDays} dias | Régua: ${templateTag}`);
    } else {
      console.log(`⏳ [SEM DISPARO HOJE] Cliente: ${customerName} | Vencimento: ${inst.due_date} | Dif: ${diffDays} dias`);
    }
  }

  console.log(`\n=== RESUMO: ${triggeredCount} parcelas elegíveis para envio no lote hoje ===`);
}

testBatchCronEngine().catch(console.error);
