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

async function main() {
  console.log('=== VERIFICANDO E LIMPANDO COBRANÇAS DO ASAAS PARA PARCELAS PAGAS MANUALMENTE ===\n');

  // 1. Fetch all installments with status='paid' and asaas_payment_id != null
  const instRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?status=eq.paid&asaas_payment_id=not.is.null&select=*,sales(*,customers(*))`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const paidInstallments = await instRes.json();
  console.log(`Encontradas ${paidInstallments.length} parcelas pagas no sistema que possuem ID do Asaas.`);

  let deletedCount = 0;

  for (const inst of paidInstallments) {
    const payId = inst.asaas_payment_id;
    if (!payId) continue;

    try {
      // Check status on Asaas API
      const checkRes = await fetch(`${ASAAS_API_URL}/payments/${payId}`, {
        headers: { 'access_token': ASAAS_API_KEY }
      });

      if (!checkRes.ok) {
        console.log(`[ASAAS CHECK] Cobrança ${payId} não encontrada ou já removida no Asaas (${checkRes.status}).`);
        continue;
      }

      const asaasPay = await checkRes.json();
      console.log(`[ASAAS CHECK] Parcela #${inst.installment_number} de ${inst.sales?.customers?.name} | Asaas ID: ${payId} | Status no Asaas: ${asaasPay.status} | Excluído: ${asaasPay.deleted}`);

      // If status on Asaas is PENDING or OVERDUE, delete it from Asaas
      if ((asaasPay.status === 'PENDING' || asaasPay.status === 'OVERDUE') && !asaasPay.deleted) {
        console.log(`  -> Excluindo cobrança ${payId} no Asaas pois foi recebida manualmente no CRM...`);
        const deleteRes = await fetch(`${ASAAS_API_URL}/payments/${payId}`, {
          method: 'DELETE',
          headers: {
            'access_token': ASAAS_API_KEY,
            'Content-Type': 'application/json'
          }
        });
        const delData = await deleteRes.json();
        console.log(`  -> Resposta de exclusão do Asaas:`, JSON.stringify(delData));
        deletedCount++;
      }
    } catch (err) {
      console.error(`Erro ao verificar/excluir cobrança ${payId}:`, err.message);
    }
  }

  console.log(`\n=== CONCLUÍDO: ${deletedCount} cobranças em aberto no Asaas foram excluídas para parcelas pagas manualmente ===`);
}

main().catch(err => console.error(err));
