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
  const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?name=ilike.*Marcinho*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const customers = await custRes.json();
  const customerId = customers[0]?.id;

  const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?customer_id=eq.${customerId}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const sales = await salesRes.json();
  const sale = sales[0];

  const instRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?sale_id=eq.${sale.id}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const installments = await instRes.json();
  const inst = installments[0];
  inst.sales = sale;

  // TEST FILTER LOGIC BEFORE VS AFTER
  const isFinanc = inst.origin_type === 'FINANCIAMENTO_CELULAR' || sale?.origin_type === 'FINANCIAMENTO_CELULAR';
  const isCrediarioLoja = inst.origin_type === 'CREDIARIO_LOJA' || sale?.origin_type === 'CREDIARIO_LOJA';
  const pm = (inst.payment_method || sale?.payment_method || '').toLowerCase();
  const pt = (sale?.payment_type || '').toLowerCase();
  const totalInsts = inst.total || inst.total_installments || sale?.installments || 1;
  const isDownPayment = inst.number === 0 || (inst).is_down_payment === true || (inst.number === 1 && (sale?.down_payment > 0 || inst.down_payment > 0) && Number(inst.value) === Number(sale?.down_payment || inst.down_payment));
  const isCardOrVista = pt === 'vista' || pt === 'card' || pt === 'debit' || pm === 'card' || pm === 'debit';
  const isExplicitCrediario = isCrediarioLoja || pt === 'crediario';

  // Old logic:
  const isSingleOld = totalInsts <= 1;
  const oldPass = !(isFinanc || isCardOrVista || isSingleOld || isDownPayment) && (isCrediarioLoja || pt === 'crediario' || totalInsts > 1);

  // New logic:
  let newPass = true;
  if (isFinanc || isCardOrVista || isDownPayment) newPass = false;
  if (!isExplicitCrediario && totalInsts <= 1) newPass = false;

  console.log('--- TESTE DA VENDA DO MARCINHO ---');
  console.log('Cliente:', customers[0].name);
  console.log('Valor:', sale.total_value, '| Condições: 1X DE R$', inst.value);
  console.log('payment_type:', pt, '| origin_type:', sale.origin_type);
  console.log('Lógica antiga passava?:', oldPass);
  console.log('Lógica nova passa?:', newPass);
}

main().catch(err => console.error(err));
