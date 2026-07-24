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
  console.log('=== CORRIGINDO STATUS DIVERGENTES DE CLIENTES NO SUPABASE ===\n');

  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch all installments
  const instRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?select=*,sales(*)`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const installments = await instRes.json();

  // 2. Fetch all customers
  const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const customers = await custRes.json();

  let updatedCount = 0;

  for (const cust of customers) {
    const custInsts = installments.filter(i => i.sales?.customer_id === cust.id);
    
    // Calculate if customer should be overdue
    const overdueInsts = custInsts.filter(i => {
      if (i.status === 'paid' || i.status === 'cancelled') return false;
      if (i.status === 'overdue') return true;
      if (i.status === 'pending' && i.due_date < today) return true;
      return false;
    });

    const targetStatus = overdueInsts.length > 0 ? 'overdue' : 'active';

    if (cust.status !== targetStatus) {
      console.log(`[CORREÇÃO] Atualizando cliente ${cust.name} (${cust.cpf}): status atual='${cust.status}' -> novo status='${targetStatus}' (Parcelas em atraso: ${overdueInsts.length})...`);
      
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${cust.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: targetStatus,
          updated_at: new Date().toISOString()
        })
      });

      if (updateRes.ok) {
        console.log(`  -> Cliente ${cust.name} atualizado com sucesso para status='${targetStatus}'.`);
        updatedCount++;
      } else {
        console.error(`  -> Erro ao atualizar cliente ${cust.name}:`, await updateRes.text());
      }
    }
  }

  console.log(`\n=== PROCESSAMENTO CONCLUÍDO: ${updatedCount} clientes corrigidos no Supabase ===`);
}

main().catch(err => console.error(err));
