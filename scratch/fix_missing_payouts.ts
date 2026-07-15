import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { processScpInstallmentPayout } from '../server/routes/scp_payout_trigger';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('--- Fetching paid installments without wallet transactions ---');
  
  // 1. Fetch all installments that are paid
  const { data: paidInstallments, error } = await supabase
    .from('installments')
    .select(`
      id,
      installment_number,
      value,
      sale_id,
      sales (
        id,
        device_id,
        device_model_manual,
        imei_manual,
        customers (name)
      )
    `)
    .eq('status', 'paid');

  if (error) {
    console.error('Error fetching paid installments:', error);
    return;
  }

  console.log(`Found ${paidInstallments.length} paid installments in total.`);

  let processedCount = 0;

  for (const inst of paidInstallments) {
    const sale = inst.sales as any;
    if (!sale) continue;

    // Check if the device associated has an investor or lot
    if (sale.device_id) {
      const { data: device } = await supabase
        .from('devices')
        .select('id, brand, model, investor_id, lot_id')
        .eq('id', sale.device_id)
        .maybeSingle();

      if (device && (device.investor_id || device.lot_id)) {
        // Check if there is already a transaction for this installment
        const { data: existingTx } = await supabase
          .from('wallet_transactions')
          .select('id')
          .eq('installment_id', inst.id)
          .maybeSingle();

        if (!existingTx) {
          console.log(`\nFound missing payout for Installment ${inst.id}:`);
          console.log(`- Sale ID: ${sale.id}`);
          console.log(`- Client: ${sale.customers?.name}`);
          console.log(`- Device: ${sale.device_model_manual}`);
          console.log(`- Installment Value: R$ ${inst.value}`);
          console.log(`- Investor: ${device.investor_id} | Lot: ${device.lot_id}`);
          
          console.log(`Running processScpInstallmentPayout...`);
          await processScpInstallmentPayout(inst.id, Number(inst.value));
          processedCount++;
        }
      }
    }
  }

  console.log(`\nDone! Processed ${processedCount} missing payouts.`);
}

run().catch(console.error);
