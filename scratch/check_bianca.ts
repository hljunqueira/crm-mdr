import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const asaasApiKey = (process.env.ASAAS_API_KEY || '').replace(/'/g, '');
const asaasUrl = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('Searching for customers with "Bianca"...');
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .ilike('name', '%Bianca%');

  if (custErr) {
    console.error('Error fetching customers:', custErr);
    return;
  }

  console.log('Found customers:', customers);

  for (const customer of customers || []) {
    console.log(`\n=== Customer: ${customer.name} (${customer.id}) ===`);
    // Get sales
    const { data: sales, error: salesErr } = await supabase
      .from('sales')
      .select('*')
      .eq('customer_id', customer.id);

    if (salesErr) {
      console.error('Error fetching sales:', salesErr);
      continue;
    }

    console.log(`Sales count: ${sales?.length}`);
    for (const sale of sales || []) {
      console.log(`Sale ID: ${sale.id}, Total: ${sale.total}, Status: ${sale.status}`);
      
      // Get installments
      const { data: installments, error: instErr } = await supabase
        .from('installments')
        .select('*')
        .eq('sale_id', sale.id)
        .order('installment_number', { ascending: true });

      if (instErr) {
        console.error('Error fetching installments:', instErr);
        continue;
      }

      for (const inst of installments || []) {
        console.log(`  Installment #${inst.installment_number}: ID: ${inst.id}, Due: ${inst.due_date}, Status: ${inst.status}, Value: ${inst.value}, Asaas ID: ${inst.asaas_payment_id}`);
        
        if (inst.asaas_payment_id) {
          try {
            console.log(`    Querying Asaas for payment ID ${inst.asaas_payment_id}...`);
            const res = await fetch(`${asaasUrl}/payments/${inst.asaas_payment_id}`, {
              headers: {
                'access_token': asaasApiKey
              }
            });
            if (res.ok) {
              const paymentInfo = await res.json();
              console.log(`    Asaas Status: ${paymentInfo.status}, Net Value: ${paymentInfo.netValue}, Payment Date: ${paymentInfo.paymentDate}, Client Payment Date: ${paymentInfo.clientPaymentDate}`);
            } else {
              const errBody = await res.text();
              console.error(`    Asaas API error (${res.status}):`, errBody);
            }
          } catch (e: any) {
            console.error(`    Failed to fetch from Asaas:`, e.message);
          }
        }
      }
    }
  }
}

run();
