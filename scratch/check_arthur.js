import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function check() {
  // Let's query recent sales
  const { data: sales, error: sError } = await supabase
    .from('sales')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('--- RECENT SALES ---');
  sales?.forEach(s => {
    console.log(`Sale ID: ${s.id}, Value: ${s.total_value}, Seller: ${s.profiles?.full_name} (${s.seller_id}), Date: ${s.sale_date}, Created: ${s.created_at}, Status: ${s.status}`);
  });

  // Let's query recent service orders
  const { data: osList, error: osError } = await supabase
    .from('service_orders')
    .select('*, profiles:profiles!responsible_technician_id(full_name)')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n--- RECENT SERVICE ORDERS ---');
  osList?.forEach(o => {
    console.log(`OS ID: ${o.id}, Number: ${o.os_number}, Technician: ${o.profiles?.full_name} (${o.responsible_technician_id}), Status: ${o.status}, Created: ${o.created_at}, Delivered: ${o.delivered_at}`);
  });
}

check();
