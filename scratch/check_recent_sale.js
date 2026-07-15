import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('--- Fetching 5 most recent sales ---');
  const { data: sales, error: salesErr } = await supabase
    .from('sales')
    .select(`
      id,
      total_value,
      down_payment,
      installments_count,
      sale_date,
      created_at,
      payment_type,
      payment_method,
      device_id,
      device_model_manual,
      imei_manual,
      customers (name),
      profiles (full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (salesErr) {
    console.error('Error fetching sales:', salesErr);
    return;
  }

  for (const s of sales) {
    console.log(`\n=============================================`);
    console.log(`SALE ID: ${s.id}`);
    console.log(`Client: ${s.customers?.name} | Seller: ${s.profiles?.full_name}`);
    console.log(`Device: ${s.device_model_manual} | IMEI: ${s.imei_manual}`);
    console.log(`Date: ${s.sale_date} | Created: ${s.created_at}`);
    console.log(`Value: R$ ${s.total_value} | Down: R$ ${s.down_payment} | Insts: ${s.installments_count}`);
    console.log(`Type: ${s.payment_type} | Method: ${s.payment_method}`);
    
    if (s.device_id) {
      const { data: device } = await supabase
        .from('devices')
        .select('id, brand, model, cost_price, investor_id, lot_id')
        .eq('id', s.device_id)
        .maybeSingle();
      
      if (device) {
        console.log(`Linked Device: ${device.brand} ${device.model} (Cost: R$ ${device.cost_price})`);
        console.log(`Investor ID: ${device.investor_id} | Lot ID: ${device.lot_id}`);
        
        if (device.investor_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', device.investor_id)
            .maybeSingle();
          console.log(`Investor Profile: ${profile?.full_name}`);
        }
        
        if (device.lot_id) {
          const { data: lot } = await supabase
            .from('lots')
            .select('title')
            .eq('id', device.lot_id)
            .maybeSingle();
          console.log(`SCP Lot: ${lot?.title}`);
        }
      } else {
        console.log(`Linked Device ID ${s.device_id} not found in devices table!`);
      }
    } else {
      console.log(`No linked device (device_id is null).`);
    }

    console.log('--- Installments ---');
    const { data: insts } = await supabase
      .from('installments')
      .select('id, installment_number, total_installments, value, due_date, payment_date, status, payment_method')
      .eq('sale_id', s.id)
      .order('installment_number');
    
    if (insts && insts.length > 0) {
      insts.forEach(i => {
        console.log(`  Inst #${i.installment_number}/${i.total_installments}: Val R$ ${i.value} | Status: ${i.status} | Paid Date: ${i.payment_date} | Method: ${i.payment_method}`);
      });

      // Let's also check if there are wallet transactions for these installments
      const instIds = insts.map(i => i.id);
      const { data: txs } = await supabase
        .from('wallet_transactions')
        .select('*')
        .in('installment_id', instIds);
      
      console.log('--- Wallet Transactions for Installments ---');
      if (txs && txs.length > 0) {
        txs.forEach(t => {
          console.log(`  Tx: Profile ${t.profile_id} | Type: ${t.type} | Amount: R$ ${t.amount} | Cap: R$ ${t.capital_portion} | Int: R$ ${t.interest_portion} | Desc: ${t.description}`);
        });
      } else {
        console.log('  No wallet transactions found.');
      }
    } else {
      console.log('  No installments found for this sale.');
    }
  }
}

run();
