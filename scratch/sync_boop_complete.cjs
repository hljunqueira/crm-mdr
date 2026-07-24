const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

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
  console.log('=== VERIFICANDO E ATUALIZANDO CLIENTE BOOP (BOP HEER) ===\n');

  // 1. Asaas API Verification
  console.log('1. Consultando Asaas API para o cliente cus_000183058228...');
  const payRes = await fetch(`${ASAAS_API_URL}/payments?customer=cus_000183058228`, {
    headers: { 'access_token': ASAAS_API_KEY }
  });
  const paymentsData = await payRes.json();
  const payments = paymentsData.data || [];

  console.log(`Encontradas ${payments.length} cobranças no Asaas.`);

  const overduePayments = payments.filter(p => p.status === 'OVERDUE');
  const pendingPayments = payments.filter(p => p.status === 'PENDING');
  const receivedPayments = payments.filter(p => p.status === 'RECEIVED' || p.status === 'CONFIRMED');

  console.log(`- Cobranças em ATRASO (OVERDUE): ${overduePayments.length}`);
  console.log(`- Cobranças PENDENTES (PENDING): ${pendingPayments.length}`);
  console.log(`- Cobranças PAGAS (RECEIVED/CONFIRMED): ${receivedPayments.length}`);

  if (overduePayments.length > 0) {
    console.log('\nDetalhes da(s) parcela(s) em atraso no Asaas:');
    overduePayments.forEach(p => {
      console.log(`  - ID: ${p.id} | Descrição: ${p.description} | Valor: R$ ${p.value} | Vencimento: ${p.dueDate} | Status: ${p.status} | URL: ${p.invoiceUrl}`);
    });
  }

  // 2. Fetch Customer in Supabase
  console.log('\n2. Buscando Cliente no Supabase...');
  const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?cpf=eq.236.549.238-01`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const customers = await custRes.json();
  const customer = customers[0];

  if (!customer) {
    console.error('Cliente não encontrado no Supabase!');
    return;
  }

  console.log(`Cliente encontrado: ${customer.name} (ID: ${customer.id})`);
  console.log(`Status atual no Supabase: ${customer.status}`);

  // 3. Fetch Sales and Installments in Supabase
  console.log('\n3. Buscando Vendas e Parcelas do cliente no Supabase...');
  const salesRes = await fetch(`${SUPABASE_URL}/rest/v1/sales?customer_id=eq.${customer.id}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const sales = await salesRes.json();
  console.log(`Vendas encontradas: ${sales.length}`);

  let allInstallments = [];
  if (sales.length > 0) {
    const saleIds = sales.map(s => `sale_id.eq.${s.id}`).join(',');
    const instRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?or=(${saleIds})`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    allInstallments = await instRes.json();
    console.log(`Parcelas encontradas no Supabase: ${allInstallments.length}`);
  }

  // 4. Update Supabase
  const isOverdue = overduePayments.length > 0;
  const newCustomerStatus = isOverdue ? 'overdue' : 'active';

  console.log(`\n4. Atualizando cliente no Supabase para status: "${newCustomerStatus}"...`);
  const updateCustRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?id=eq.${customer.id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      status: newCustomerStatus,
      asaas_customer_id: 'cus_000183058228',
      updated_at: new Date().toISOString()
    })
  });
  const updatedCust = await updateCustRes.json();
  console.log('Cliente atualizado com sucesso no Supabase.');

  // Sync installment statuses with Asaas
  for (const p of payments) {
    const matchingInst = allInstallments.find(i => i.asaas_payment_id === p.id || (i.installment_number === 1 && p.description.includes('Parcela 1/8')));
    if (matchingInst) {
      let instStatus = 'pending';
      if (p.status === 'OVERDUE') instStatus = 'overdue';
      else if (p.status === 'RECEIVED' || p.status === 'CONFIRMED') instStatus = 'paid';

      console.log(`Atualizando parcela ${matchingInst.id} (Asaas ${p.id}) -> status: ${instStatus}`);
      await fetch(`${SUPABASE_URL}/rest/v1/installments?id=eq.${matchingInst.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: instStatus,
          asaas_payment_id: p.id,
          asaas_invoice_url: p.invoiceUrl,
          updated_at: new Date().toISOString()
        })
      });
    }
  }

  // 5. Update local SQLite DB if file exists
  console.log('\n5. Verificando banco de dados local SQLite...');
  const appDataPath = process.env.APPDATA 
    ? path.join(process.env.APPDATA, 'CRM-MDR', 'database.db')
    : path.join(process.cwd(), 'data', 'database.db');
  
  const possiblePaths = [
    appDataPath,
    path.join(__dirname, '..', 'data', 'database.db'),
    path.join(__dirname, '..', 'server', 'data', 'database.db')
  ];

  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      console.log(`Encontrado SQLite local em: ${dbPath}`);
      try {
        const sqlite = new Database(dbPath);
        sqlite.prepare(`UPDATE customers SET status = ?, asaas_customer_id = ?, updated_at = datetime('now') WHERE id = ?`)
          .run(newCustomerStatus, 'cus_000183058228', customer.id);
        console.log('Cliente atualizado no SQLite local.');

        for (const p of payments) {
          let instStatus = 'pending';
          if (p.status === 'OVERDUE') instStatus = 'overdue';
          else if (p.status === 'RECEIVED' || p.status === 'CONFIRMED') instStatus = 'paid';
          
          sqlite.prepare(`UPDATE installments SET status = ?, asaas_payment_id = ?, asaas_invoice_url = ?, updated_at = datetime('now') WHERE asaas_payment_id = ?`)
            .run(instStatus, p.id, p.invoiceUrl, p.id);
        }
        sqlite.close();
      } catch (err) {
        console.error(`Erro ao atualizar SQLite local em ${dbPath}:`, err.message);
      }
    }
  }

  console.log('\n=== PROCESSO CONCLUÍDO COM SUCESSO ===');
}

main().catch(err => console.error('Erro na execução:', err));
