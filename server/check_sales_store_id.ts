import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSalesStoreId() {
  const { data: sales, error } = await supabase
    .from('sales')
    .select('id, down_payment, origin_type, store_id, device_model_manual, created_at, installments_count, customers(name)');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total de vendas no banco: ${sales?.length}`);

  let totalDown = 0;
  const downList: any[] = [];

  sales?.forEach((sale: any) => {
    const down = Number(sale.down_payment) || 0;
    if (down <= 0) return;

    totalDown += down;
    const cust = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
    downList.push({
      id: sale.id,
      store_id: sale.store_id,
      customerName: cust?.name || 'Balcão',
      deviceModel: sale.device_model_manual || 'Aparelho',
      downPayment: down,
      originType: sale.origin_type,
      installments_count: sale.installments_count
    });
  });

  console.log(`\nTotal de vendas com entrada > 0: ${downList.length}`);
  console.log(`Soma Total das Entradas: R$ ${totalDown.toFixed(2)}`);

  console.log('\n--- Agrupamento por store_id ---');
  const byStore: { [key: string]: { count: number; sum: number } } = {};
  downList.forEach(item => {
    const st = item.store_id || 'SEM_STORE_ID';
    if (!byStore[st]) byStore[st] = { count: 0, sum: 0 };
    byStore[st].count++;
    byStore[st].sum += item.downPayment;
  });

  console.log(JSON.stringify(byStore, null, 2));

  console.log('\n--- Primeiras 10 entradas ---');
  downList.slice(0, 10).forEach(d => console.log(d));
}

checkSalesStoreId();
