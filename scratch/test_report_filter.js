import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const gaivotaUnitId = 'cf7efbfd-dd63-4618-9d9b-0887a1ec5032';
  
  // Simulated frontend logic
  const { data: salesRaw } = await supabase.from('sales').select('*, customers(name), devices(cost_price)');
  const sales = (salesRaw || []).map((s) => ({
    id: s.id,
    unit_id: s.store_id,
    customer_id: s.customer_id,
    device_id: s.device_id,
    customer_name: s.customers?.name || 'Cliente Removido',
    device_model: s.device_model_manual || 'Modelo não informado',
    imei: s.imei_manual || '',
    total_value: Number(s.total_value),
    down_payment: Number(s.down_payment),
    service_fee: Number(s.service_fee),
    original_price: Number(s.original_price),
    installments: s.installments_count,
    date: s.sale_date,
    status: s.status,
    payment_type: s.payment_type || 'crediario',
  }));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filterByDateRange = (dateStr) => {
    if (!dateStr) return false;
    const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const date = new Date(cleanDateStr + 'T12:00:00');
    if (isNaN(date.getTime())) return false;

    // 30 days filter
    const past30 = new Date(today);
    past30.setDate(today.getDate() - 30);
    const inRange = date >= past30 && date <= new Date(today.getTime() + 86400000);
    return { inRange, date, past30, limit: new Date(today.getTime() + 86400000) };
  };

  const sale = sales.find(s => s.unit_id === gaivotaUnitId);
  console.log('Sample Sale:', sale);
  if (sale) {
    console.log('Date range filter result:', filterByDateRange(sale.date));
  }
}

run();
