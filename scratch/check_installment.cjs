const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const ref = 'ed67902e-6d7f-424f-b098-b5e5da101508';
  
  // Search sales_items for the sold device
  const { data: salesItems } = await supabase
    .from('sale_items')
    .select('*, sales(*, customers(*))')
    .eq('device_id', '8ce30f34-1c10-4d31-ad8b-fae660541158');
  console.log('Sales Items for moto e20:', salesItems);

  if (salesItems && salesItems.length > 0) {
    const saleId = salesItems[0].sale_id;
    console.log('Sale ID found:', saleId);
    
    // Fetch installments for this sale
    const { data: insts } = await supabase
      .from('installments')
      .select('*')
      .eq('sale_id', saleId);
    console.log('Installments for this sale:', insts);
  }
}

check();
