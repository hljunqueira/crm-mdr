const dotenv = require('dotenv');
dotenv.config();

async function verifyFinancialData() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL/Key missing');
    return;
  }

  const fetchNode = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

  async function queryTable(table, select, filterStr = '') {
    const url = `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}${filterStr}`;
    const res = await fetchNode(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    if (!res.ok) {
      throw new Error(`Error fetching ${table}: ${await res.text()}`);
    }
    return await res.json();
  }

  try {
    console.log('--- EXECUTANDO TESTES E VERIFICAÇÃO NO BANCO ---');

    // 1. Recebidos (status = paid)
    const paidInsts = await queryTable('installments', 'value,status,id', '&status=eq.paid');
    const recebidos = paidInsts.reduce((acc, i) => acc + Number(i.value || 0), 0);
    console.log(`\n1. INSTALLMENTS PAGO (Count: ${paidInsts.length}):`);
    console.log(`   Soma Total Recebidos: R$ ${recebidos.toFixed(2)}`);

    // 2. A Receber (status in pending, overdue)
    const pendingInsts = await queryTable('installments', 'value,status,id', '&status=in.(pending,overdue)');
    const aReceber = pendingInsts.reduce((acc, i) => acc + Number(i.value || 0), 0);
    console.log(`\n2. INSTALLMENTS A RECEBER (Count: ${pendingInsts.length}):`);
    console.log(`   Soma Total A Receber: R$ ${aReceber.toFixed(2)}`);

    // 3. Em Conta Investidores (wallets.balance)
    const wallets = await queryTable('wallets', 'id,balance');
    const emConta = wallets.reduce((acc, w) => acc + Number(w.balance || 0), 0);
    console.log(`\n3. WALLETS (Count: ${wallets.length}):`);
    console.log(`   Saldo Em Conta p/ Saque: R$ ${emConta.toFixed(2)}`);
    wallets.forEach(w => console.log(`   - Wallet ${w.id}: R$ ${Number(w.balance).toFixed(2)}`));

    // 4. Saques Efetuados e Pendentes
    const withdrawals = await queryTable('withdrawal_requests', 'amount,status,id');
    const saqueEfetuado = withdrawals.filter(w => w.status === 'APPROVED').reduce((acc, w) => acc + Number(w.amount || 0), 0);
    const saquesPendentes = withdrawals.filter(w => w.status === 'PENDING').reduce((acc, w) => acc + Number(w.amount || 0), 0);
    console.log(`\n4. WITHDRAWAL REQUESTS (Count: ${withdrawals.length}):`);
    console.log(`   Saques Efetuados (APPROVED): R$ ${saqueEfetuado.toFixed(2)}`);
    console.log(`   Saques Pendentes (PENDING): R$ ${saquesPendentes.toFixed(2)}`);

    // 5. Transactions (Repasse Investidores)
    const txs = await queryTable('wallet_transactions', 'amount,type,id');
    const repasseTotal = txs.reduce((acc, t) => {
      if (['PROFIT', 'AMORTIZATION', 'CREDIT'].includes(t.type)) {
        return acc + Number(t.amount || 0);
      }
      return acc;
    }, 0);
    console.log(`\n5. WALLET TRANSACTIONS (Count: ${txs.length}):`);
    console.log(`   Repasse Histórico Total: R$ ${repasseTotal.toFixed(2)}`);

    // 6. Rendimento Líquido Financeira
    const rendimentoLiquido = Math.max(0, recebidos - repasseTotal);
    console.log(`\n6. CALCULADOS DA FINANCEIRA:`);
    console.log(`   Rendimento Líquido (Recebidos - Repasse): R$ ${rendimentoLiquido.toFixed(2)}`);

    console.log('\n--- VERIFICAÇÃO DE INTEGRIDADE DAS EQUAÇÕES ---');
    const diffConciliacao = (emConta + saqueEfetuado) - repasseTotal;
    console.log(`   [Wallets + Saques Efetuados] - Repasse Histórico = R$ ${diffConciliacao.toFixed(2)}`);
    if (Math.abs(diffConciliacao) < 0.01) {
      console.log('   ✅ BATEU PERFEITAMENTE COM O BANCO DE DADOS (Diferença: R$ 0,00)!');
    } else {
      console.log(`   ⚠️ Discrepância encontrada: R$ ${diffConciliacao.toFixed(2)}`);
    }

  } catch (err) {
    console.error('Erro ao verificar banco:', err);
  }
}

verifyFinancialData();
