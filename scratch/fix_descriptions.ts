import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('--- Fixing descriptions in wallet_transactions ---');

  // Fetch all transactions
  const { data: txs, error } = await supabase
    .from('wallet_transactions')
    .select(`
      id,
      description,
      installment_id,
      installments (
        id,
        sale_id,
        sales (
          id,
          device_id
        )
      )
    `);

  if (error) {
    console.error('Error fetching transactions:', error);
    return;
  }

  let updatedCount = 0;
  for (const t of txs) {
    const desc = t.description || '';
    if (desc.includes('Prime') && !desc.includes('(Celular #')) {
      const inst = t.installments as any;
      const deviceId = inst?.sales?.device_id;
      if (deviceId) {
        const newDesc = `${desc} (Celular #${deviceId})`;
        console.log(`Updating Transaction ${t.id}:`);
        console.log(`- Old description: "${desc}"`);
        console.log(`- New description: "${newDesc}"`);
        
        await supabase
          .from('wallet_transactions')
          .update({ description: newDesc })
          .eq('id', t.id);
          
        updatedCount++;
      }
    }
  }

  console.log(`Finished! Updated ${updatedCount} descriptions.`);
}

run().catch(console.error);
