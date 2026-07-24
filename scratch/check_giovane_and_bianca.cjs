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

const ASAAS_API_KEY = envVars.ASAAS_API_KEY;
const ASAAS_API_URL = envVars.ASAAS_API_URL || 'https://api.asaas.com/v3';
const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

async function checkCustomer(nameSearch) {
  console.log(`\n==================================================`);
  console.log(`VERIFICANDO CLIENTE: ${nameSearch}`);
  console.log(`==================================================`);

  // 1. Fetch customer
  const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?name=ilike.*${nameSearch}*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const customers = await custRes.json();
  console.log('Cliente no Supabase:', JSON.stringify(customers, null, 2));

  if (customers.length === 0) return;
  const cust = customers[0];

  // 2. Fetch sales
  const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?customer_id=eq.${cust.id}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const sales = await salesRes.json();
  console.log('\nVendas do Cliente:', JSON.stringify(sales, null, 2));

  for (const s of sales) {
    // 3. Fetch installments for sale
    const instRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?sale_id=eq.${s.id}&order=installment_number.asc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const installments = await instRes.json();
    console.log(`\nParcelas da Venda ${s.id}:`, JSON.stringify(installments, null, 2));

    // 4. Fetch Cash Transactions
    const instIds = installments.map(i => `installment_id.eq.${i.id}`).join(',');
    if (instIds) {
      const txRes = await fetch(`${SUPABASE_URL}/rest/v1/cash_transactions?or=(${instIds})`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      console.log('\nTransações no Caixa:', JSON.stringify(await txRes.json(), null, 2));
    }

    // 5. Check Asaas API for each installment's asaas_payment_id
    for (const inst of installments) {
      if (inst.asaas_payment_id) {
        console.log(`\nConsultando Asaas API para parcela #${inst.installment_number} (Asaas ID: ${inst.asaas_payment_id})...`);
        const asaasRes = await fetch(`${ASAAS_API_URL}/payments/${inst.asaas_payment_id}`, {
          headers: { 'access_token': ASAAS_API_KEY }
        });
        if (asaasRes.ok) {
          const asaasPay = await asaasRes.json();
          console.log(`  Asaas Data: status=${asaasPay.status}, value=${asaasPay.value}, dueDate=${asaasPay.dueDate}, paymentDate=${asaasPay.paymentDate}, clientPaymentDate=${asaasPay.clientPaymentDate}, deleted=${asaasPay.deleted}`);
        } else {
          console.log(`  Asaas Response: ${asaasRes.status} (Cobrança não encontrada ou excluída no Asaas)`);
        }
      }
    }
  }
}

async function main() {
  await checkCustomer('giovane');
  await checkCustomer('bianca');
}

main().catch(err => console.error(err));
