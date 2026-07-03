import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function recalculateFutureReceipts(profileId: string): Promise<number> {
  try {
    const { data: devices } = await supabase
      .from("devices")
      .select("id, sale_price, prime_admin_fee, prime_profit_share")
      .eq("investor_id", profileId);

    let totalPrimeFuture = 0;

    for (const dev of (devices || [])) {
      const deviceSalePrice = Number(dev.sale_price || 0);
      
      const { data: sale } = await supabase
        .from("sales")
        .select("id, total_value")
        .eq("device_id", dev.id)
        .not("status", "in", '("cancelled","refunded")')
        .maybeSingle();

      if (sale) {
        const { data: insts } = await supabase
          .from("installments")
          .select("id, status, value")
          .eq("sale_id", sale.id)
          .not("status", "in", '("cancelled")');

        const unpaidInsts = (insts || []).filter(i => i.status !== "paid");
        for (const inst of unpaidInsts) {
          const instValue = Number(inst.value);
          const saleTotal = Number(sale.total_value || 0);
          
          const amortization = saleTotal > 0 
            ? instValue * (deviceSalePrice / saleTotal)
            : 0;
            
          const totalProfit = instValue - amortization;
          const adminFee = Number(dev.prime_admin_fee ?? 0.10);
          const profitShare = Number(dev.prime_profit_share ?? 0.60);
          const netProfit = totalProfit * (1.0 - adminFee);
          const investorProfit = netProfit * profitShare;
          const expectedValue = amortization + investorProfit;

          totalPrimeFuture += expectedValue;
        }
      }
    }

    const { data: purchases } = await supabase
      .from("receivable_purchases")
      .select("sale_id, total_receivable, purchase_price, ownership_percentage")
      .eq("profile_id", profileId);

    let totalRendaFuture = 0;

    for (const pur of (purchases || [])) {
      if (pur.sale_id) {
        const { data: insts } = await supabase
          .from("installments")
          .select("id, status, value")
          .eq("sale_id", pur.sale_id)
          .not("status", "in", '("cancelled")');

        const unpaidInsts = (insts || []).filter(i => i.status !== "paid");
        for (const inst of unpaidInsts) {
          const shareValue = Number(inst.value) * Number(pur.ownership_percentage || 1);
          totalRendaFuture += shareValue;
        }
      }
    }

    return Number((totalPrimeFuture + totalRendaFuture).toFixed(2));
  } catch (err) {
    console.error(err);
    return 0;
  }
}

async function run() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'investor');

  for (const p of profiles || []) {
    const val = await recalculateFutureReceipts(p.id);
    console.log(`Investor: ${p.full_name} | Calculated Future Receipts: R$ ${val}`);
    
    // Perform update in the DB to test the update
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('profile_id', p.id)
      .maybeSingle();

    if (wallet) {
      console.log(`Current DB Wallet Future Receipts: R$ ${wallet.future_receipts}`);
      if (Number(wallet.future_receipts) !== val) {
        const { error } = await supabase
          .from('wallets')
          .update({ future_receipts: val })
          .eq('profile_id', p.id);
        if (error) console.error('Error updating DB wallet:', error);
        else console.log('Successfully updated DB wallet to match calculated value.');
      }
    }
  }
}

run();
