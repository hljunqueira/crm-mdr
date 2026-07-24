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
  // 1. Get customer record from Supabase
  const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?cpf=eq.236.549.238-01`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const customers = await custRes.json();
  console.log('Customer in Supabase:', JSON.stringify(customers, null, 2));

  if (customers.length === 0) {
    console.log('Customer not found by CPF 236.549.238-01');
    return;
  }

  const customer = customers[0];

  // 2. Get installments for this customer in Supabase
  const instRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?customer_id=eq.${customer.id}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const installments = await instRes.json();
  console.log('\nInstallments in Supabase:', JSON.stringify(installments, null, 2));

  // 3. Update customer status to 'overdue' if not already set, and set asaas_customer_id if missing
  console.log(`\nCurrent customer status: "${customer.status}"`);

  // Update customer status in Supabase
  const updatePayload = {
    status: 'overdue',
    asaas_customer_id: customer.asaas_customer_id || 'cus_000183058228',
    updated_at: new Date().toISOString()
  };

  console.log('Updating customer in Supabase with payload:', updatePayload);

  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${customer.id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(updatePayload)
  });

  const updatedCust = await updateRes.json();
  console.log('Updated customer response:', JSON.stringify(updatedCust, null, 2));

  // Also update installment pay_5825v7uljnjyhtrg status to 'overdue' if found
  for (const inst of installments) {
    if (inst.asaas_payment_id === 'pay_5825v7uljnjyhtrg' || inst.due_date === '2026-07-10') {
      console.log(`Updating installment ${inst.id} to overdue...`);
      const instUpdateRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?id=eq.${inst.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ status: 'overdue', updated_at: new Date().toISOString() })
      });
      console.log('Updated installment response:', await instUpdateRes.json());
    }
  }
}

main().catch(err => console.error(err));
