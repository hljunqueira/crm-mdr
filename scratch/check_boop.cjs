const fs = require('fs');
const path = require('path');

// Load .env
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

console.log('ASAAS_API_URL:', ASAAS_API_URL);
console.log('SUPABASE_URL:', SUPABASE_URL);

async function main() {
  // 1. Search customer in Supabase
  const searchUrl = `${SUPABASE_URL}/rest/v1/customers?select=*&or=(name.ilike.*bop*,name.ilike.*boop*,cpf.ilike.*236*)`;
  const supaRes = await fetch(searchUrl, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });

  const customers = await supaRes.json();
  console.log('Supabase Customers found:', JSON.stringify(customers, null, 2));

  // 2. Search customer in Asaas API
  console.log('\n--- Searching Asaas API ---');
  let asaasCustomer = null;

  // Try by CPF if customer found
  if (customers && customers.length > 0) {
    for (const cust of customers) {
      const cleanCpf = cust.cpf ? cust.cpf.replace(/\D/g, '') : '';
      if (cleanCpf) {
        console.log(`Checking Asaas for CPF: ${cleanCpf}`);
        const res = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${cleanCpf}`, {
          headers: { 'access_token': ASAAS_API_KEY }
        });
        const data = await res.json();
        console.log(`Asaas response by CPF (${cleanCpf}):`, JSON.stringify(data, null, 2));
        if (data.data && data.data.length > 0) {
          asaasCustomer = data.data[0];
        }
      }
    }
  }

  // Also try searching name "BOP" or "BOOP" directly on Asaas if not found by CPF
  if (!asaasCustomer) {
    console.log('Searching Asaas by name "BOP"...');
    const res = await fetch(`${ASAAS_API_URL}/customers?name=BOP`, {
      headers: { 'access_token': ASAAS_API_KEY }
    });
    const data = await res.json();
    console.log('Asaas response by name BOP:', JSON.stringify(data, null, 2));
  }

  if (!asaasCustomer) {
    console.log('Searching Asaas by name "BOOP"...');
    const res = await fetch(`${ASAAS_API_URL}/customers?name=BOOP`, {
      headers: { 'access_token': ASAAS_API_KEY }
    });
    const data = await res.json();
    console.log('Asaas response by name BOOP:', JSON.stringify(data, null, 2));
  }

  // 3. If customer found on Asaas, fetch their payments
  if (asaasCustomer || (customers && customers.length > 0)) {
    const custId = asaasCustomer ? asaasCustomer.id : (customers[0]?.asaas_customer_id || null);
    console.log(`\nFetching payments for Asaas Customer ID: ${custId}`);
    
    if (custId) {
      const payRes = await fetch(`${ASAAS_API_URL}/payments?customer=${custId}`, {
        headers: { 'access_token': ASAAS_API_KEY }
      });
      const payments = await payRes.json();
      console.log('Asaas Payments:', JSON.stringify(payments, null, 2));

      // Fetch overdue payments specifically
      const overdueRes = await fetch(`${ASAAS_API_URL}/payments?customer=${custId}&status=OVERDUE`, {
        headers: { 'access_token': ASAAS_API_KEY }
      });
      const overduePayments = await overdueRes.json();
      console.log('Asaas Overdue Payments:', JSON.stringify(overduePayments, null, 2));
    }
  }
}

main().catch(err => console.error('Error:', err));
