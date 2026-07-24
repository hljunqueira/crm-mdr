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
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log('=== VERIFICANDO PARCELAS E RECEBIMENTOS PARA BOP HEER ===\n');

  // 1. Fetch customer Bop Heer
  const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?or=(name.ilike.*bop*,cpf.ilike.*236.549*)`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const customers = await custRes.json();
  console.log('Customer:', JSON.stringify(customers, null, 2));

  if (customers.length === 0) return;
  const cust = customers[0];

  // 2. Fetch sales for Bop Heer
  const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?customer_id=eq.${cust.id}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const sales = await salesRes.json();
  console.log('\nSales for customer:', JSON.stringify(sales, null, 2));

  if (sales.length === 0) return;
  const sale = sales[0];

  // 3. Fetch installments for Bop Heer's sale
  const instRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?sale_id=eq.${sale.id}&order=installment_number.asc`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const installments = await instRes.json();
  console.log('\nInstallments for sale:', JSON.stringify(installments, null, 2));

  // 4. Fetch cash transactions for these installments
  const instIds = installments.map(i => `installment_id.eq.${i.id}`).join(',');
  const txRes = await fetch(`${SUPABASE_URL}/rest/v1/cash_transactions?or=(${instIds})`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  console.log('\nCash Transactions:', JSON.stringify(await txRes.json(), null, 2));
}

main().catch(err => console.error(err));
