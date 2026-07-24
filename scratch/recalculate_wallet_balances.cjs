const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltam variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function recalculateWallets() {
  console.log("=== INICIANDO RECÁLCULO DE SALDOS DAS CARTEIRAS (APENAS LUCRO) ===");

  // 1. Obter todas as carteiras
  const { data: wallets, error: wErr } = await supabase.from('wallets').select('*');
  if (wErr) {
    console.error("Erro ao buscar carteiras:", wErr);
    process.exit(1);
  }

  console.log(`Encontradas ${wallets.length} carteiras para processar.`);

  for (const wallet of wallets) {
    const profileId = wallet.profile_id;

    // 2. Buscar todas as transações de lucro
    const { data: txs, error: txErr } = await supabase
      .from('wallet_transactions')
      .select('type, amount, interest_portion')
      .eq('profile_id', profileId);

    if (txErr) {
      console.error(`Erro ao buscar transações do perfil ${profileId}:`, txErr);
      continue;
    }

    const totalProfit = (txs || []).reduce((acc, t) => {
      if (t.type === 'PROFIT') return acc + Number(t.amount || 0);
      if (t.interest_portion && Number(t.interest_portion) > 0) return acc + Number(t.interest_portion);
      return acc;
    }, 0);

    // 3. Buscar saques aprovados e pendentes (saques pendentes já reservam saldo)
    const { data: withdrawals, error: wdErr } = await supabase
      .from('withdrawal_requests')
      .select('amount, status')
      .eq('profile_id', profileId)
      .in('status', ['APPROVED', 'PENDING']);

    if (wdErr) {
      console.error(`Erro ao buscar saques do perfil ${profileId}:`, wdErr);
      continue;
    }

    const totalWithdrawn = (withdrawals || []).reduce((acc, w) => acc + Number(w.amount || 0), 0);

    // 4. Calcular novo saldo disponível (trava zero)
    const oldBalance = Number(wallet.balance || 0);
    const newBalance = Math.max(0, Number((totalProfit - totalWithdrawn).toFixed(2)));

    // 5. Atualizar carteira
    const { error: upErr } = await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id);

    if (upErr) {
      console.error(`Erro ao atualizar carteira ${wallet.id}:`, upErr);
    } else {
      console.log(`Profile: ${profileId} | Saldo Antigo: R$ ${oldBalance.toFixed(2)} | Lucro Acumulado: R$ ${totalProfit.toFixed(2)} | Saques/Reservas: R$ ${totalWithdrawn.toFixed(2)} | Novo Saldo para Saque: R$ ${newBalance.toFixed(2)}`);
    }
  }

  console.log("=== RECÁLCULO DE CARTEIRAS CONCLUÍDO COM SUCESSO ===");
}

recalculateWallets();
