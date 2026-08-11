import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listDownPayments() {
  const { data: salesData } = await supabase
    .from('sales')
    .select('id, down_payment, origin_type, store_id, device_model, customers(name)');

  console.log('=== DETALHAMENTO DO CARD ENTRADAS DIRETAS DE VENDAS (R$ 26.625,99) ===\n');

  let total = 0;
  (salesData || []).forEach((sale: any) => {
    const down = Number(sale.down_payment) || 0;
    if (down > 0) {
      total += down;
      const cust = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
      console.log(`- Cliente: ${cust?.name || 'Balcão'} | Aparelho: ${sale.device_model || 'Smartphone'} | Entrada: R$ ${down.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    }
  });

  console.log(`\n=======================================================`);
  console.log(`TOTAL DE ENTRADAS RECEBIDAS NO BALCÃO: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`=======================================================\n`);
}

listDownPayments();
