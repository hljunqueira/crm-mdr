const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSales() {
  const deviceIds = [
    'abcf79c5-b66a-4684-b772-275fbaf90172',
    '64b37e92-ef75-4e7d-9448-8ee57ff01afb',
    'ddaf2a82-6b6f-47bb-b7fb-3a7805186a38'
  ];

  for (const devId of deviceIds) {
    console.log(`\n=== Device ${devId} ===`);
    const { data: sales } = await supabase.from('sales').select('*').eq('device_id', devId);
    console.log('Sales:', sales);

    if (sales && sales.length > 0) {
      for (const s of sales) {
        const { data: insts } = await supabase.from('installments').select('*').eq('sale_id', s.id);
        console.log(`Installments for Sale ${s.id}:`, insts ? insts.length : 0);
        console.log('Installments detail:', insts);
      }
    }
  }
}

checkSales();
