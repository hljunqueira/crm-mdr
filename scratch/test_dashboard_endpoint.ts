import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDashboard(profile_id: string) {
  try {
    console.log(`\nTesting dashboard for profile: ${profile_id}`);
    
    // 1. Get Wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("balance, future_receipts")
      .eq("profile_id", profile_id)
      .maybeSingle();

    if (walletError) throw walletError;
    const walletData = wallet || { balance: 0, future_receipts: 0 };
    console.log('Wallet fetched:', walletData);

    // 2. Get Investor Quotas and associated Lots
    const { data: quotas, error: quotasError } = await supabase
      .from("investor_quotas")
      .select(`
        id,
        amount_invested,
        ownership_percentage,
        interest_sharing_percentage,
        contract_url,
        signed_contract_at,
        lot:lots (
          id,
          title,
          target_amount,
          status
        )
      `)
      .eq("profile_id", profile_id);

    if (quotasError) throw quotasError;
    console.log('Quotas fetched:', quotas?.length);

    // 3. Fetch all wallet transactions for this investor
    const { data: allTransactions, error: txsErr } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("profile_id", profile_id)
      .order("created_at", { ascending: false });

    if (txsErr) throw txsErr;
    console.log('Transactions fetched:', allTransactions?.length);

    const credits = (allTransactions || []).filter(t => t.type === "AMORTIZATION" || t.type === "PROFIT");
    const capitalRecovered = credits.filter(t => t.type === "AMORTIZATION").reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const interestReceived = credits.filter(t => t.type === "PROFIT").reduce((acc, t) => acc + Number(t.amount || 0), 0);
    const totalReceived = capitalRecovered + interestReceived;

    // 4. Calculate monthly receipts history
    const monthlyHistoryMap: Record<string, { month: string; amount: number }> = {};
    credits.forEach(c => {
      const date = new Date(c.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
      if (!monthlyHistoryMap[key]) {
        monthlyHistoryMap[key] = { month: label.toUpperCase(), amount: 0 };
      }
      monthlyHistoryMap[key].amount += Number(c.amount);
    });

    const monthlyHistory = Object.keys(monthlyHistoryMap)
      .sort()
      .map(k => monthlyHistoryMap[k]);

    // 5. Gather detailed products (smartphones) metrics and list
    let activeDevicesCount = 0;
    let paidDevicesCount = 0;
    let defaultedDevicesCount = 0;

    const myProducts: any[] = [];
    const lotsList = [];

    // LEGACY LOTS METRICS
    let legacyCapitalInvested = 0;
    if (quotas) {
      for (const q of quotas) {
        if (!q.lot) continue;
        const lot: any = q.lot;
        const lotTarget = Number(lot.target_amount || q.amount_invested || 1);
        const ownershipFraction = Number(q.amount_invested) / lotTarget;
        legacyCapitalInvested += Number(q.amount_invested || 0);

        // Fetch devices in this lot
        const { data: devices } = await supabase
          .from("devices")
          .select("id, brand, model, imei, status, cost_price")
          .eq("lot_id", lot.id);

        const totalProducts = devices ? devices.length : 0;
        const soldProducts = devices ? devices.filter(d => d.status === "sold").length : 0;

        let lotHealthRate = 100.0;

        if (devices && devices.length > 0) {
          const deviceIds = devices.map(d => d.id);

          // Get sales for these devices
          const { data: sales } = await supabase
            .from("sales")
            .select("id, device_id, customer:customers(name), installments:installments_count")
            .in("device_id", deviceIds)
            .neq("status", "cancelled");

          for (const dev of devices) {
            const devSale = sales ? sales.find(s => s.device_id === dev.id) : null;
            if (devSale) {
              // Fetch installments for this sale
              const { data: insts } = await supabase
                .from("installments")
                .select("id, status, value, paid_value, installment_number")
                .eq("sale_id", devSale.id)
                .neq("status", "cancelled");

              const totalInst = insts ? insts.length : 1;
              const paidInst = insts ? insts.filter(i => i.status === "paid").length : 0;
              const isOverdue = insts ? insts.some(i => i.status === "overdue" || i.status === "blocked") : false;

              // Calculate device-specific capital returned and interest received
              const devTxs = credits.filter(t => t.description && t.description.includes(`Lote: ${lot.title}`));

              const devCapReturned = devTxs.filter(t => t.type === "AMORTIZATION").reduce((sum, t) => sum + Number(t.amount || 0), 0) * ownershipFraction;
              const devIntReceived = devTxs.filter(t => t.type === "PROFIT").reduce((sum, t) => sum + Number(t.amount || 0), 0) * ownershipFraction;

              let devStatus = "ativo";
              if (paidInst === totalInst) {
                devStatus = "quitado";
                paidDevicesCount++;
              } else if (isOverdue) {
                devStatus = "inadimplente";
                defaultedDevicesCount++;
              } else {
                activeDevicesCount++;
              }

              myProducts.push({
                id: dev.id,
                model: `${dev.brand} ${dev.model}`,
                imei: dev.imei,
                client: (devSale as any).customer?.name || "Cliente",
                installments: `${paidInst}/${totalInst}`,
                capitalReturned: Number(devCapReturned.toFixed(2)),
                interestReceived: Number(devIntReceived.toFixed(2)),
                totalReceived: Number((devCapReturned + devIntReceived).toFixed(2)),
                remainingValue: Number((q.amount_invested * ownershipFraction - devCapReturned).toFixed(2)),
                status: devStatus
              });
            } else {
              // In stock
              myProducts.push({
                id: dev.id,
                model: `${dev.brand} ${dev.model}`,
                imei: dev.imei,
                client: "-",
                installments: "-",
                capitalReturned: 0,
                interestReceived: 0,
                totalReceived: 0,
                remainingValue: Number((Number(dev.cost_price || 0) * ownershipFraction).toFixed(2)),
                status: "estoque"
              });
              activeDevicesCount++;
            }
          }

          // Compute lot health rate
          if (sales && sales.length > 0) {
            const saleIds = sales.map(s => s.id);
            const { data: insts } = await supabase
              .from("installments")
              .select("status")
              .in("sale_id", saleIds);

            if (insts && insts.length > 0) {
              const activeInsts = insts.filter(i => i.status !== "cancelled");
              if (activeInsts.length > 0) {
                const healthyInsts = activeInsts.filter(i => i.status !== "overdue" && i.status !== "blocked");
                lotHealthRate = Number(((healthyInsts.length / activeInsts.length) * 100).toFixed(1));
              }
            }
          }
        }

        lotsList.push({
          id: lot.id,
          quotaId: q.id,
          title: lot.title,
          amountInvested: Number(q.amount_invested),
          ownershipPercentage: Number(q.ownership_percentage) * 100,
          interestSharingPercentage: Number(q.interest_sharing_percentage ?? 0.20) * 100,
          totalProducts,
          soldProducts,
          healthRate: lotHealthRate,
          status: lot.status,
          contractUrl: q.contract_url,
          signedContractAt: q.signed_contract_at
        });
      }
    }

    // 6. PRIME PORTFOLIO (Estoque Próprio)
    const { data: primeDevices, error: primeErr } = await supabase
      .from("devices")
      .select("id, brand, model, imei, status, cost_price, prime_profit_share, prime_admin_fee")
      .eq("investor_id", profile_id);

    if (primeErr) throw primeErr;
    console.log('Prime devices fetched:', primeDevices?.length);

    let primeCapitalInvested = 0;
    const primeProductsList = [];

    for (const dev of (primeDevices || [])) {
      primeCapitalInvested += Number(dev.cost_price || 0);

      const { data: sales } = await supabase
        .from("sales")
        .select("id, customer:customers(name), total_value")
        .eq("device_id", dev.id)
        .neq("status", "cancelled")
        .maybeSingle();

      if (sales) {
        const { data: insts } = await supabase
          .from("installments")
          .select("id, status, value, paid_value, installment_number")
          .eq("sale_id", sales.id)
          .neq("status", "cancelled");

        const totalInst = insts ? insts.length : 1;
        const paidInst = insts ? insts.filter(i => i.status === "paid").length : 0;
        const isOverdue = insts ? insts.some(i => i.status === "overdue" || i.status === "blocked") : false;

        const devTxs = credits.filter(t => t.description && t.description.includes(`Celular #${dev.id}`));
        const devCapReturned = devTxs.filter(t => t.type === "AMORTIZATION").reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const devIntReceived = devTxs.filter(t => t.type === "PROFIT").reduce((sum, t) => sum + Number(t.amount || 0), 0);

        let devStatus = "ativo";
        if (paidInst === totalInst) {
          devStatus = "quitado";
          paidDevicesCount++;
        } else if (isOverdue) {
          devStatus = "inadimplente";
          defaultedDevicesCount++;
        } else {
          activeDevicesCount++;
        }

        primeProductsList.push({
          id: dev.id,
          model: `${dev.brand} ${dev.model}`,
          imei: dev.imei,
          client: (sales as any).customer?.name || "Cliente",
          installments: `${paidInst}/${totalInst}`,
          capitalReturned: Number(devCapReturned.toFixed(2)),
          interestReceived: Number(devIntReceived.toFixed(2)),
          totalReceived: Number((devCapReturned + devIntReceived).toFixed(2)),
          remainingValue: Number((Number(dev.cost_price || 0) - devCapReturned).toFixed(2)),
          status: devStatus
        });
      } else {
        primeProductsList.push({
          id: dev.id,
          model: `${dev.brand} ${dev.model}`,
          imei: dev.imei,
          client: "-",
          installments: "-",
          capitalReturned: 0,
          interestReceived: 0,
          totalReceived: 0,
          remainingValue: Number(Number(dev.cost_price || 0).toFixed(2)),
          status: "estoque"
        });
        activeDevicesCount++;
      }
    }

    // 7. RENDA PORTFOLIO (Compra de Recebíveis)
    const { data: rendaPurchases, error: rendaErr } = await supabase
      .from("receivable_purchases")
      .select(`
        *,
        sale:sales (
          id,
          total_value,
          customer:customers (name),
          device:devices (brand, model, imei)
        )
      `)
      .eq("profile_id", profile_id);

    if (rendaErr) throw rendaErr;
    console.log('Renda purchases fetched:', rendaPurchases?.length);

    let rendaCapitalInvested = 0;
    let totalRendaReceivable = 0;
    let totalRendaFuture = 0;
    let totalRendaOverdue = 0;
    const rendaPurchasesList = [];

    for (const pur of (rendaPurchases || [])) {
      rendaCapitalInvested += Number(pur.purchase_price || 0);
      totalRendaReceivable += Number(pur.total_receivable || 0) * Number(pur.ownership_percentage || 1);

      const { data: insts } = await supabase
        .from("installments")
        .select("id, status, value, due_date")
        .eq("sale_id", pur.sale_id)
        .neq("status", "cancelled");

      let purchasePaidValue = 0;
      let purchaseOverdueValue = 0;

      if (insts) {
        for (const inst of insts) {
          const shareValue = Number(inst.value) * Number(pur.ownership_percentage || 1);
          if (inst.status === "paid") {
            purchasePaidValue += shareValue;
          } else {
            totalRendaFuture += shareValue;
            if (inst.status === "overdue" || inst.status === "blocked" || new Date(inst.due_date) < new Date()) {
              totalRendaOverdue += shareValue;
              purchaseOverdueValue += shareValue;
            }
          }
        }
      }

      const clientName = pur.sale && (pur.sale as any).customer ? (pur.sale as any).customer.name : "Contrato";
      const devInfo = pur.sale && (pur.sale as any).device
        ? `${(pur.sale as any).device.brand} ${(pur.sale as any).device.model}`
        : "Aparelho";

      rendaPurchasesList.push({
        id: pur.id,
        saleId: pur.sale_id,
        client: clientName,
        device: devInfo,
        purchasePrice: Number(pur.purchase_price),
        totalReceivable: Number(pur.total_receivable) * Number(pur.ownership_percentage || 1),
        ownershipPercentage: Number(pur.ownership_percentage) * 100,
        paidValue: Number(purchasePaidValue.toFixed(2)),
        overdueValue: Number(purchaseOverdueValue.toFixed(2)),
        status: purchaseOverdueValue > 0 ? "atrasado" : (totalRendaFuture === 0 ? "quitado" : "em dia"),
        createdAt: pur.created_at
      });
    }

    const capitalInvested = legacyCapitalInvested + primeCapitalInvested + rendaCapitalInvested;
    const roi = capitalInvested > 0 ? (interestReceived / capitalInvested) * 100 : 0;
    const delinquencyRate = totalRendaReceivable > 0 ? (totalRendaOverdue / totalRendaReceivable) * 100 : 0;

    const result = {
      wallet: {
        balance: Number(walletData.balance),
        futureReceipts: Number(walletData.future_receipts),
        capitalInvested,
        capitalRecovered,
        interestReceived,
        totalReceived,
        roi,
        activeDevicesCount,
        paidDevicesCount,
        defaultedDevicesCount
      },
      lots: lotsList,
      products: [...myProducts, ...primeProductsList],
      renda: {
        purchases: rendaPurchasesList,
        totalReceivable: totalRendaReceivable,
        totalFuture: totalRendaFuture,
        totalOverdue: totalRendaOverdue,
        delinquencyRate: Number(delinquencyRate.toFixed(2))
      },
      transactions: (allTransactions || []).slice(0, 30).map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description || "",
        date: new Date(t.created_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })
      })),
      monthlyHistory
    };

    console.log('SUCCESS! Dashboard data generated successfully.');
  } catch (err) {
    console.error('FAILED! Dashboard error:', err);
  }
}

async function run() {
  await testDashboard('66e6e1d9-e1ee-48dc-a105-f032d7525cde');
  await testDashboard('b4209d7b-939a-4e7a-9509-8d46adafb977');
}

run();
