const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInvestor(nameFilter) {
  const { data: profiles } = await supabase.from('profiles').select('id, full_name').ilike('full_name', `%${nameFilter}%`);
  if (!profiles || profiles.length === 0) return;
  const p = profiles[0];

  console.log(`\n========================================`);
  console.log(`TESTING FOR: ${p.full_name} (${p.id})`);
  console.log(`========================================`);

  // 1. Fetch prime devices
  const { data: primeDevices } = await supabase
    .from("devices")
    .select("*")
    .eq("investor_id", p.id);

  let primeCapitalInvested = 0;
  let primeCapReturnedTotal = 0;
  let primeIntReceivedTotal = 0;

  for (const dev of (primeDevices || [])) {
    const deviceSalePrice = dev.prime_valuation_type === "cost"
      ? Number(dev.cost_price || 0)
      : Number(dev.sale_price || dev.cost_price || 0);
    primeCapitalInvested += deviceSalePrice;

    const { data: sales } = await supabase
      .from("sales")
      .select("id, total_value")
      .eq("device_id", dev.id)
      .neq("status", "cancelled")
      .maybeSingle();

    if (sales) {
      const { data: insts } = await supabase
        .from("installments")
        .select("*")
        .eq("sale_id", sales.id)
        .neq("status", "cancelled");

      const totalInst = insts ? insts.length : 1;
      const paidInst = insts ? insts.filter(i => i.status === "paid").length : 0;
      
      const cappedDeviceSalePrice = (sales.total_value > 0 && deviceSalePrice > sales.total_value)
        ? Number(sales.total_value)
        : deviceSalePrice;

      let devCapReturned = paidInst * (cappedDeviceSalePrice / totalInst);
      primeCapReturnedTotal += devCapReturned;
      
      console.log(`Device: ${dev.model} | Sold: R$ ${sales.total_value} | Paid Inst: ${paidInst}/${totalInst} | Capital Returned: R$ ${devCapReturned}`);
    } else {
      console.log(`Device: ${dev.model} | In Stock (Unsold) | Cost: R$ ${dev.cost_price}`);
    }
  }

  console.log(`Total Capital Invested: R$ ${primeCapitalInvested}`);
  console.log(`Total Capital Returned (Calculated): R$ ${primeCapReturnedTotal}`);
  console.log(`Capital Active Remaining: R$ ${primeCapitalInvested - primeCapReturnedTotal}`);
}

async function main() {
  await testInvestor('Jean');
  await testInvestor('Roberto');
}

main();
