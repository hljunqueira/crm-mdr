import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDownPaymentsSplit() {
  const { data: sales } = await supabase
    .from('sales')
    .select('id, down_payment, origin_type, store_id, device_model_manual, created_at, installments_count, payment_type, customers(name, cpf)');

  let sumFinanc = 0;
  const listFinanc: any[] = [];

  let sumOutras = 0;
  const listOutras: any[] = [];

  sales?.forEach((sale: any) => {
    const down = Number(sale.down_payment) || 0;
    if (down <= 0) return;

    const cust = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
    const isFinanc = sale.origin_type === 'FINANCIAMENTO_CELULAR' || (sale.installments_count && sale.installments_count > 1 && sale.payment_type !== 'vista');

    const item = {
      id: sale.id,
      customerName: cust?.name || 'Cliente Balcão',
      customerCpf: cust?.cpf || '',
      deviceModel: sale.device_model_manual || 'Aparelho / Produto',
      downPayment: down,
      date: sale.created_at,
      originType: sale.origin_type
    };

    if (isFinanc) {
      sumFinanc += down;
      listFinanc.push(item);
    } else {
      sumOutras += down;
      listOutras.push(item);
    }
  });

  console.log('=== SEPARAÇÃO DAS ENTRADAS ===\n');
  console.log(`1. ENTRADAS DE FINANCIAMENTO DE CELULAR: R$ ${sumFinanc.toFixed(2)} (${listFinanc.length} vendas)`);
  listFinanc.forEach(i => console.log(`   - ${i.customerName} | ${i.deviceModel} | R$ ${i.downPayment.toFixed(2)}`));

  console.log(`\n2. OUTRAS ENTRADAS E VENDAS À VISTA: R$ ${sumOutras.toFixed(2)} (${listOutras.length} vendas)`);
  console.log(`\nTOTAL GERAL: R$ ${(sumFinanc + sumOutras).toFixed(2)}`);
}

testDownPaymentsSplit();
