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
  console.log('=== AUDITORIA DE RECEBIMENTOS MANUAIS E STATUS DE CLIENTES ===\n');

  const today = new Date().toISOString().split('T')[0];
  console.log(`Data Base de Comparação (Hoje): ${today}\n`);

  // 1. Fetch all installments
  const instRes = await fetch(`${SUPABASE_URL}/rest/v1/installments?select=*,sales(*,customers(*))`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const installments = await instRes.json();
  console.log(`Total de parcelas analisadas: ${installments.length}`);

  // 2. Fetch all cash transactions for installments
  const txRes = await fetch(`${SUPABASE_URL}/rest/v1/cash_transactions?category=eq.installment`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const cashTxList = await txRes.json();
  console.log(`Total de transações de recebimento de parcela no caixa: ${cashTxList.length}`);

  const txByInstallmentId = new Map();
  for (const tx of cashTxList) {
    if (tx.installment_id) {
      txByInstallmentId.set(tx.installment_id, tx);
    }
  }

  // 3. Find Installment Discrepancies
  const installmentDiscrepancies = [];

  for (const inst of installments) {
    const hasCashTx = txByInstallmentId.has(inst.id);
    const hasPaymentInfo = inst.payment_date !== null || (inst.paid_value !== null && Number(inst.paid_value) > 0);

    if ((hasCashTx || hasPaymentInfo) && inst.status !== 'paid') {
      installmentDiscrepancies.push({
        installment_id: inst.id,
        sale_id: inst.sale_id,
        installment_number: inst.installment_number,
        total_installments: inst.total_installments,
        current_status: inst.status,
        due_date: inst.due_date,
        payment_date: inst.payment_date,
        paid_value: inst.paid_value,
        customer_name: inst.sales?.customers?.name,
        customer_id: inst.sales?.customers?.id,
        has_cash_transaction: hasCashTx
      });
    }
  }

  console.log(`\nParcelas com Recebimento Registrado mas Status != 'paid': ${installmentDiscrepancies.length}`);
  console.log(JSON.stringify(installmentDiscrepancies, null, 2));

  // 4. Audit Customer Status vs Overdue Installments
  console.log('\n--- AUDITANDO STATUS DOS CLIENTES ---');
  const custRes = await fetch(`${SUPABASE_URL}/rest/v1/customers?select=*`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const customers = await custRes.json();
  console.log(`Total de clientes cadastrados: ${customers.length}`);

  const customerDiscrepancies = [];

  for (const cust of customers) {
    // Find all sales for customer
    const custSales = installments.filter(i => i.sales?.customer_id === cust.id);
    
    // Check if customer has any truly overdue installments (due_date < today and status != paid)
    const overdueInsts = custSales.filter(i => {
      if (i.status === 'paid' || i.status === 'cancelled') return false;
      if (i.status === 'overdue') return true;
      if (i.status === 'pending' && i.due_date < today) return true;
      return false;
    });

    const isCustomerOverdueInDb = cust.status === 'overdue';
    const shouldBeOverdue = overdueInsts.length > 0;

    if (isCustomerOverdueInDb !== shouldBeOverdue) {
      customerDiscrepancies.push({
        customer_id: cust.id,
        name: cust.name,
        cpf: cust.cpf,
        current_db_status: cust.status,
        calculated_status: shouldBeOverdue ? 'overdue' : 'active',
        total_installments: custSales.length,
        actual_overdue_count: overdueInsts.length,
        overdue_details: overdueInsts.map(i => ({ id: i.id, due_date: i.due_date, status: i.status, value: i.value }))
      });
    }
  }

  console.log(`\nClientes com Status Divergente no Banco: ${customerDiscrepancies.length}`);
  console.log(JSON.stringify(customerDiscrepancies, null, 2));
}

main().catch(err => console.error(err));
