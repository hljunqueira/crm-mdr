const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envConfig.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.substring(1, val.length - 1);
    }
    envVars[key] = val;
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

async function main() {
  const instRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?select=*,sales(*,customers(*))&order=due_date.asc`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const installments = await instRes.json();
  const today = '2026-08-07';

  const pendingOrOverdue = installments.filter(i => i.status !== 'paid' && i.status !== 'pago');

  let orphanedCount = 0;
  pendingOrOverdue.forEach(i => {
    const sale = i.sales;
    const customerName = sale?.customers?.name || 'Sem nome';

    // Priority: sale.origin_type > inst.origin_type > default
    const effectiveOrigin = sale?.origin_type || i.origin_type || 'CREDIARIO_LOJA';
    const isFinanc = effectiveOrigin === 'FINANCIAMENTO_CELULAR';
    const isCrediarioLoja = effectiveOrigin === 'CREDIARIO_LOJA';

    const totalInsts = i.total || i.total_installments || sale?.installments || 1;
    const isDownPayment = i.number === 0 || i.installment_number === 0 || i.is_down_payment === true ||
      (i.installment_number === 1 && (sale?.down_payment > 0 || i.down_payment > 0) && Number(i.value) === Number(sale?.down_payment || i.down_payment));

    // Simple, clean classification:
    const passesFinancFilter = isFinanc && !isDownPayment;
    const passesLojaFilter = isCrediarioLoja && !isDownPayment;

    if (!passesFinancFilter && !passesLojaFilter) {
      orphanedCount++;
      console.log(`[ÓRFÃ] ${customerName} | R$ ${i.value} | ${i.due_date}`);
    }
  });

  console.log(`\nCom a classificação limpa e sem conflitos, total de parcelas órfãs = ${orphanedCount}`);

  console.log('\n=== LISTA DE TODAS AS PARCELAS VENCIDAS OU PENDENTES NO BANCO ===\n');
  const overdueInsts = pendingOrOverdue.filter(i => i.due_date <= today || i.status === 'overdue');
  overdueInsts.forEach((i, idx) => {
    const sale = i.sales;
    const customerName = sale?.customers?.name || 'Sem nome';
    const totalInsts = i.total || i.total_installments || sale?.installments || 1;

    const effectiveOrigin = sale?.origin_type || i.origin_type || 'CREDIARIO_LOJA';
    const isFinanc = effectiveOrigin === 'FINANCIAMENTO_CELULAR';
    const isDownPayment = i.number === 0 || i.installment_number === 0 || i.is_down_payment === true ||
      (i.installment_number === 1 && (sale?.down_payment > 0 || i.down_payment > 0) && Number(i.value) === Number(sale?.down_payment || i.down_payment));

    const passesFinanc = isFinanc && !isDownPayment;
    const tabTarget = passesFinanc ? 'Caixa Financiamento Celular / Recebíveis' : 'Caixa Crediário Loja';

    console.log(`[VENCIDA #${idx+1}] ${customerName.padEnd(35)} | R$ ${String(i.value).padEnd(8)} (${i.installment_number}/${totalInsts}) | Venc: ${i.due_date} | Destino: ${tabTarget}`);
  });
}

main().catch(err => console.error(err));
