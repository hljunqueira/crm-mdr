import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Investigando venda do cliente Otávio Cardoso Santana...');

  // 1. Buscar cliente
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name')
    .ilike('name', '%OTAVIO CARDOSO%')
    .maybeSingle();

  if (!customer) {
    console.log('Cliente Otávio Cardoso não localizado.');
    return;
  }

  console.log('Cliente encontrado:', customer);

  // 2. Buscar vendas deste cliente
  const { data: sales } = await supabase
    .from('sales')
    .select('*, devices(*)')
    .eq('customer_id', customer.id);

  console.log('Vendas do cliente:', JSON.stringify(sales, null, 2));

  if (sales && sales.length > 0) {
    for (const sale of sales) {
      // 3. Buscar parcelas da venda
      const { data: insts } = await supabase
        .from('installments')
        .select('*')
        .eq('sale_id', sale.id);

      console.log(`Parcelas da venda ${sale.id}:`, JSON.stringify(insts, null, 2));

      // 4. Buscar transações da carteira geradas para esta venda/parcelas
      const instIds = (insts || []).map(i => i.id);
      if (instIds.length > 0) {
        const { data: walletTxs } = await supabase
          .from('wallet_transactions')
          .select('*, profiles(full_name)')
          .in('installment_id', instIds);

        console.log(`Transações de carteira (SCP) geradas para a venda ${sale.id}:`, JSON.stringify(walletTxs, null, 2));
      }
    }
  }
}

run();
