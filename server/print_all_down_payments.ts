import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function printAllDownPayments() {
  const { data: sales } = await supabase
    .from('sales')
    .select('*, customers(name)');

  console.log('=== LISTA DE VENDAS COM ENTRADA (down_payment) ===\n');

  let totalDown = 0;
  sales?.forEach(s => {
    const down = Number(s.down_payment || 0);
    if (down > 0) {
      totalDown += down;
      const custName = Array.isArray(s.customers) ? s.customers[0]?.name : s.customers?.name;
      console.log(`- Venda ID: ${s.id.slice(0, 8)} | Cliente: ${custName || 'Balcão'} | Modelo: ${s.device_model_manual || 'Item'} | Tipo: ${s.payment_type} | Entrada: R$ ${down.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    }
  });

  console.log(`\n======================================================`);
  console.log(`SOMA TOTAL DAS ENTRADAS DE VENDAS (LOJA): R$ ${totalDown.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`======================================================\n`);
}

printAllDownPayments();
