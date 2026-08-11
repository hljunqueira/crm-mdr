import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Estornando transação de comissão indevida do cliente Otávio (Parcela 1)...');

  const installmentId = '302c3701-6e98-41d0-8f86-566e2d0f8f42';
  const profileId = 'a0f9800a-8af2-4fdf-9f32-92a34800f15a'; // Roberto Dielo

  // 1. Buscar a transação indevida de R$ 6,72
  const { data: tx, error: fetchErr } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('installment_id', installmentId)
    .maybeSingle();

  if (fetchErr) {
    console.error('Erro ao buscar transação:', fetchErr);
    return;
  }

  if (!tx) {
    console.log('Transação já removida ou não encontrada.');
  } else {
    console.log('Transação indevida localizada:', tx);

    // 2. Deletar a transação de carteira
    const { error: delErr } = await supabase
      .from('wallet_transactions')
      .delete()
      .eq('id', tx.id);

    if (delErr) {
      console.error('Erro ao deletar transação de carteira:', delErr);
      return;
    }

    console.log('Transação deletada com sucesso.');

    // 3. Ajustar saldo da carteira do investidor (subtrair 6.72 de balance)
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (wallet) {
      const newBalance = Math.max(0, Number(wallet.balance) - Number(tx.amount));
      await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id);

      console.log(`Saldo da carteira do investidor ajustado de R$ ${wallet.balance} para R$ ${newBalance}.`);
    }
  }
}

run();
