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
  console.log('=== CORRIGINDO RECEBIMENTO MANUAL E STATUS DE BOP HEER ===\n');

  const instId = 'beae0530-e7ad-4491-ba51-c35e80469ee9';
  const customerId = '997c224d-b1d8-4356-b646-79e47024759c';

  // 1. Update Installment in Supabase to status 'paid'
  console.log(`1. Atualizando parcela ${instId} para status 'paid'...`);
  const instRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?id=eq.${instId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      status: 'paid',
      payment_date: '2026-07-14T19:36:32.000Z',
      payment_method: 'pix',
      paid_value: 257.28,
      interest_value: 5.29,
      discount_value: 0,
      updated_at: new Date().toISOString()
    })
  });
  const updatedInst = await instRes.json();
  console.log('Parcela atualizada:', JSON.stringify(updatedInst, null, 2));

  // 2. Update Customer status to 'active'
  console.log(`\n2. Atualizando status do cliente ${customerId} para 'active'...`);
  const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      status: 'active',
      last_payment_date: '2026-07-14T19:36:32.000Z',
      updated_at: new Date().toISOString()
    })
  });
  const updatedCust = await custRes.json();
  console.log('Cliente atualizado:', JSON.stringify(updatedCust, null, 2));

  // 3. Process SCP Payout if applicable
  console.log('\n3. Processando repasse do investidor via SCP payout trigger...');
  const { processScpInstallmentPayout } = await import('../server/routes/scp_payout_trigger.js');
  await processScpInstallmentPayout(instId, 257.28);

  console.log('\n=== CORREÇÃO CONCLUÍDA COM SUCESSO ===');
}

main().catch(err => console.error('Erro:', err));
