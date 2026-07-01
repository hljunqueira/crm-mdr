import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import fetch from "node-fetch";
import { formatWhatsAppJid } from "../lib/phoneHelper.js";

const router = Router();

// 1. POST /api/scp/auth/request-otp — Inicia autenticação do investidor por WhatsApp/Celular
router.post("/auth/request-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Número de celular/WhatsApp é obrigatório." });
    }

    // Limpar o número recebido
    const cleanPhone = phone.replace(/\D/g, "");

    // Buscar perfil do investidor com base no telefone
    // Suporta telefones armazenados com ou sem DDI 55
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, role, phone");

    if (profErr || !profiles) {
      return res.status(404).json({ error: "Perfil do investidor não encontrado." });
    }

    // Filtrar perfil combinando números limpos
    const profile = profiles.find(p => {
      if (!p.phone) return false;
      const cleanProfilePhone = p.phone.replace(/\D/g, "");
      return cleanProfilePhone === cleanPhone || `55${cleanProfilePhone}` === cleanPhone || cleanProfilePhone === `55${cleanPhone}`;
    });

    if (!profile) {
      return res.status(404).json({ error: "Nenhum perfil de parceiro cadastrado com este telefone." });
    }

    if (profile.role !== "investor" && profile.role !== "admin") {
      return res.status(403).json({ error: "Acesso restrito a investidores e administradores." });
    }

    // Obter o e-mail do investidor a partir do auth.users (necessário para o auth_otps)
    const { data: userObj, error: userError } = await supabase.auth.admin.getUserById(profile.id);
    if (userError || !userObj || !userObj.user?.email) {
      return res.status(404).json({ error: "E-mail do investidor não configurado." });
    }

    const email = userObj.user.email;

    // Rate limiting: evitar reenvio rápido (menos de 60 segundos)
    const { data: existingOtp } = await supabase
      .from("auth_otps")
      .select("created_at")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingOtp) {
      const diff = Date.now() - new Date(existingOtp.created_at).getTime();
      if (diff < 60000) {
        return res.status(429).json({ error: "Aguarde 60 segundos antes de solicitar um novo código." });
      }
    }

    // Gerar OTP de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiração

    const { error: otpError } = await supabase
      .from("auth_otps")
      .insert({
        email,
        code,
        expires_at: expiresAt,
        attempts: 0
      });

    if (otpError) {
      return res.status(500).json({ error: "Falha ao gravar código de verificação." });
    }

    // Buscar canal ativo do WhatsApp
    const { data: channels } = await supabase
      .from("automation_channels")
      .select("instance_name")
      .eq("status", "connected")
      .limit(1);

    const instanceName = channels && channels.length > 0 ? channels[0].instance_name : "mdr";

    // Formata o JID remoto de destino
    const remoteJid = formatWhatsAppJid(cleanPhone);
    const messageText = `*PARCEIROS MDR* 🔐\n\nOlá, ${profile.full_name}!\nSeu código de acesso temporário para o portal de investimentos é:\n\n*${code}*\n\nEste código expira em 5 minutos. Não compartilhe com terceiros.`;

    const n8nUrl = process.env.N8N_2FA_WEBHOOK_URL || `${process.env.N8N_API_URL}/webhook/auth-2fa`;

    // Disparar o fluxo do n8n para enviar o WhatsApp
    try {
      await fetch(n8nUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-N8N-API-KEY": process.env.N8N_API_KEY || ""
        },
        body: JSON.stringify({
          instanceName,
          remoteJid,
          text: messageText,
          phone: cleanPhone,
          code,
          name: profile.full_name
        })
      });
    } catch (err) {
      console.error("[Partners OTP Webhook] Erro ao chamar n8n:", err);
    }

    res.json({ success: true, message: "Código enviado com sucesso!" });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. POST /api/scp/auth/verify-otp — Valida o código OTP e autoriza o login
router.post("/auth/verify-otp", async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: "Telefone e código são obrigatórios." });
    }

    const cleanPhone = phone.replace(/\D/g, "");

    // Buscar perfil do investidor
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, role, phone");

    if (profErr || !profiles) {
      return res.status(404).json({ error: "Perfil não encontrado." });
    }

    const profile = profiles.find(p => {
      if (!p.phone) return false;
      const cleanProfilePhone = p.phone.replace(/\D/g, "");
      return cleanProfilePhone === cleanPhone || `55${cleanProfilePhone}` === cleanPhone || cleanProfilePhone === `55${cleanPhone}`;
    });

    if (!profile) {
      return res.status(404).json({ error: "Parceiro não cadastrado com este telefone." });
    }

    // Obter e-mail
    const { data: userObj, error: userError } = await supabase.auth.admin.getUserById(profile.id);
    if (userError || !userObj || !userObj.user?.email) {
      return res.status(404).json({ error: "E-mail do investidor não encontrado." });
    }

    const email = userObj.user.email;

    // Buscar OTP
    const { data: otp, error: otpError } = await supabase
      .from("auth_otps")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otp) {
      return res.status(400).json({ error: "Código expirado ou inválido." });
    }

    if (new Date() > new Date(otp.expires_at)) {
      await supabase.from("auth_otps").delete().eq("id", otp.id);
      return res.status(400).json({ error: "Código expirado. Solicite outro." });
    }

    if (otp.code !== code.trim()) {
      const nextAttempts = (otp.attempts || 0) + 1;
      await supabase
        .from("auth_otps")
        .update({ attempts: nextAttempts })
        .eq("id", otp.id);

      return res.status(400).json({ error: "Código incorreto." });
    }

    // Sucesso, limpar OTP
    await supabase.from("auth_otps").delete().eq("id", otp.id);

    // Retorna payload de login contendo o perfil
    res.json({
      success: true,
      token: `partners_session_${profile.id}_${Date.now()}`, // Token local para controle de sessão simples
      profile: {
        id: profile.id,
        role: profile.role
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. GET /api/scp/lots — Listar todos os lotes do SCP
router.get("/lots", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("lots")
      .select("*, devices(*), investor_quotas(*, profiles(full_name))")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/scp/lots — Criar um lote SCP
router.post("/lots", async (req, res) => {
  try {
    const { title, target_amount, status } = req.body;
    const { data, error } = await supabase
      .from("lots")
      .insert({ title, target_amount, status })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. POST /api/scp/quotas — Associar investidor a um lote (cota)
router.post("/quotas", async (req, res) => {
  try {
    const { profile_id, lot_id, amount_invested, ownership_percentage, interest_sharing_percentage } = req.body;
    const { data, error } = await supabase
      .from("investor_quotas")
      .insert({
        profile_id,
        lot_id,
        amount_invested,
        ownership_percentage,
        interest_sharing_percentage: interest_sharing_percentage !== undefined ? interest_sharing_percentage : 0.20
      })
      .select()
      .single();

    if (error) throw error;

    // Atualiza o saldo de recebíveis futuros na carteira do investidor
    const { data: wallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("profile_id", profile_id)
      .maybeSingle();

    if (wallet) {
      await supabase
        .from("wallets")
        .update({
          future_receipts: Number(wallet.future_receipts || 0) + Number(amount_invested)
        })
        .eq("id", wallet.id);
    } else {
      await supabase
        .from("wallets")
        .insert({
          profile_id,
          balance: 0,
          future_receipts: amount_invested
        });
    }

    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. GET /api/scp/dashboard/:profile_id — Obter dados consolidados do investidor para o dashboard
router.get("/dashboard/:profile_id", async (req, res) => {
  try {
    const { profile_id } = req.params;

    // 1. Get Wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("balance, future_receipts")
      .eq("profile_id", profile_id)
      .maybeSingle();

    if (walletError) throw walletError;
    const walletData = wallet || { balance: 0, future_receipts: 0 };

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

    // 3. Fetch all wallet transactions for this investor
    const { data: allTransactions, error: txsErr } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("profile_id", profile_id)
      .order("created_at", { ascending: false });

    if (txsErr) throw txsErr;

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
    let projectedInterest = 0;
    const monthlyForecastMap: Record<string, { month: string; amount: number }> = {};
    const upcomingPayments: any[] = [];

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
            .select("id, device_id, total_value, original_price, customer:customers(name), installments")
            .in("device_id", deviceIds)
            .neq("status", "cancelled");

          for (const dev of devices) {
            const devSale = sales ? sales.find(s => s.device_id === dev.id) : null;
            if (devSale) {
              // Fetch installments for this sale
              const { data: insts } = await supabase
                .from("installments")
                .select("id, status, value, paid_value, installment_number, due_date")
                .eq("sale_id", devSale.id)
                .neq("status", "cancelled");

              const totalInst = insts ? insts.length : 1;
              const paidInst = insts ? insts.filter(i => i.status === "paid").length : 0;
              const isOverdue = insts ? insts.some(i => i.status === "overdue" || i.status === "blocked") : false;

              // Calculate device-specific capital returned and interest received
              const devTxs = credits.filter(t => t.description && t.description.includes(`Lote: ${lot.title}`));

              const devCapReturned = devTxs.filter(t => t.type === "AMORTIZATION").reduce((sum, t) => sum + Number(t.amount || 0), 0) * ownershipFraction;
              const devIntReceived = devTxs.filter(t => t.type === "PROFIT").reduce((sum, t) => sum + Number(t.amount || 0), 0) * ownershipFraction;

              // Calculate projected interest & monthly forecast for unpaid installments
              const unpaidInsts = (insts || []).filter(i => i.status !== "paid");
              unpaidInsts.forEach(inst => {
                const instValue = Number(inst.value);
                const netValue = instValue * 0.90; // 10% operational fee
                const saleTotal = Number(devSale.total_value || 0);
                const costFraction = saleTotal > 0 ? Number(dev.cost_price || 0) / saleTotal : 0;
                const totalAmortization = netValue * costFraction;
                const totalProfit = netValue - totalAmortization;
                const investorProfit = totalProfit * ownershipFraction;
                projectedInterest += investorProfit;

                const expectedValue = (totalAmortization * ownershipFraction) + investorProfit;
                upcomingPayments.push({
                  id: `${dev.id}-${inst.id}`,
                  type: "LOTE",
                  description: `${dev.brand} ${dev.model} (${lot.title})`,
                  client: (devSale as any).customer?.name || "Cliente",
                  dueDate: inst.due_date,
                  installmentNumber: `${inst.installment_number}/${totalInst}`,
                  expectedValue: Number(expectedValue.toFixed(2)),
                  status: inst.status
                });

                // Add to monthly forecast
                const date = new Date(inst.due_date);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const label = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
                if (!monthlyForecastMap[key]) {
                  monthlyForecastMap[key] = { month: label.toUpperCase(), amount: 0 };
                }
                monthlyForecastMap[key].amount += expectedValue;
              });

              // Contract total profit & final value for the investor
              const saleTotal = Number(devSale.total_value || 0);
              const projectedTotalContract = saleTotal * 0.90 * ownershipFraction;
              const investorCapital = Number(dev.cost_price || 0) * ownershipFraction;
              const projectedTotalProfit = Math.max(0, projectedTotalContract - investorCapital);

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
                projectedTotalProfit: Number(projectedTotalProfit.toFixed(2)),
                projectedTotalContract: Number(projectedTotalContract.toFixed(2)),
                saleTotalValue: saleTotal,
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
                projectedTotalProfit: 0,
                projectedTotalContract: 0,
                saleTotalValue: 0,
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
          signed_contract_at: q.signed_contract_at
        });
      }
    }

    // 6. PRIME PORTFOLIO (Estoque Próprio)
    const { data: primeDevices, error: primeErr } = await supabase
      .from("devices")
      .select("id, brand, model, imei, status, cost_price, sale_price, prime_profit_share, prime_admin_fee, prime_valuation_type")
      .eq("investor_id", profile_id);

    if (primeErr) throw primeErr;

    let primeCapitalInvested = 0;
    const primeProductsList = [];

    for (const dev of (primeDevices || [])) {
      const deviceSalePrice = dev.prime_valuation_type === "cost"
        ? Number(dev.cost_price || 0)
        : Number(dev.sale_price || dev.cost_price || 0);
      primeCapitalInvested += deviceSalePrice;

      const { data: sales } = await supabase
        .from("sales")
        .select("id, customer:customers(name), total_value, original_price, payment_type")
        .eq("device_id", dev.id)
        .neq("status", "cancelled")
        .maybeSingle();

      if (sales) {
        const saleTotal = Number(sales.total_value || 0);
        // Trava para evitar amortização/lucro negativo em vendas com desconto
        const cappedDeviceSalePrice = (saleTotal > 0 && deviceSalePrice > saleTotal)
          ? saleTotal
          : deviceSalePrice;

        const { data: insts } = await supabase
          .from("installments")
          .select("id, status, value, paid_value, installment_number, due_date")
          .eq("sale_id", sales.id)
          .neq("status", "cancelled");

        const totalInst = insts ? insts.length : 1;
        const paidInst = insts ? insts.filter(i => i.status === "paid").length : 0;
        const isOverdue = insts ? insts.some(i => i.status === "overdue" || i.status === "blocked") : false;

        const devTxs = credits.filter(t => t.description && t.description.includes(`Celular #${dev.id}`));
        const devCapReturned = devTxs.filter(t => t.type === "AMORTIZATION").reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const devIntReceived = devTxs.filter(t => t.type === "PROFIT").reduce((sum, t) => sum + Number(t.amount || 0), 0);

        // Calculate projected interest & monthly forecast for unpaid installments
        const unpaidInsts = (insts || []).filter(i => i.status !== "paid");
        unpaidInsts.forEach(inst => {
          const instValue = Number(inst.value);
          
          const amortization = saleTotal > 0 
            ? instValue * (cappedDeviceSalePrice / saleTotal)
            : 0;
            
          const totalProfit = instValue - amortization;
          const adminFee = Number(dev.prime_admin_fee ?? 0.10);
          const profitShare = Number(dev.prime_profit_share ?? 0.60);
          const netProfit = totalProfit * (1.0 - adminFee);
          const investorProfit = netProfit * profitShare;
          const expectedValue = amortization + investorProfit;
          projectedInterest += investorProfit;

          upcomingPayments.push({
            id: `${dev.id}-${inst.id}`,
            type: "PRIME",
            description: `${dev.brand} ${dev.model}`,
            client: (sales as any).customer?.name || "Cliente",
            dueDate: inst.due_date,
            installmentNumber: `${inst.installment_number}/${totalInst}`,
            expectedValue: Number(expectedValue.toFixed(2)),
            status: inst.status
          });

          // Add to monthly forecast
          const date = new Date(inst.due_date);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const label = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
          if (!monthlyForecastMap[key]) {
            monthlyForecastMap[key] = { month: label.toUpperCase(), amount: 0 };
          }
          monthlyForecastMap[key].amount += expectedValue;
        });

        const adminFee = Number(dev.prime_admin_fee ?? 0.10);
        const profitShare = Number(dev.prime_profit_share ?? 0.60);
        const totalProfit = saleTotal - cappedDeviceSalePrice;
        const netProfit = totalProfit * (1.0 - adminFee);
        const projectedTotalProfit = Math.max(0, netProfit * profitShare);
        const projectedTotalContract = cappedDeviceSalePrice + projectedTotalProfit;

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
          saleId: sales.id,
          model: `${dev.brand} ${dev.model}`,
          imei: dev.imei,
          client: (sales as any).customer?.name || "Cliente",
          installments: `${paidInst}/${totalInst}`,
          capitalReturned: Number(devCapReturned.toFixed(2)),
          interestReceived: Number(devIntReceived.toFixed(2)),
          totalReceived: Number((devCapReturned + devIntReceived).toFixed(2)),
          remainingValue: Number((cappedDeviceSalePrice - devCapReturned).toFixed(2)),
          projectedTotalProfit: Number(projectedTotalProfit.toFixed(2)),
          projectedTotalContract: Number(projectedTotalContract.toFixed(2)),
          saleTotalValue: saleTotal,
          status: devStatus
        });
      } else {
        primeProductsList.push({
          id: dev.id,
          saleId: null,
          model: `${dev.brand} ${dev.model}`,
          imei: dev.imei,
          client: "-",
          installments: "-",
          capitalReturned: 0,
          interestReceived: 0,
          totalReceived: 0,
          remainingValue: deviceSalePrice,
          projectedTotalProfit: 0,
          projectedTotalContract: 0,
          saleTotalValue: 0,
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
        .select("id, status, value, due_date, installment_number")
        .eq("sale_id", pur.sale_id)
        .neq("status", "cancelled");

      const clientName = pur.sale && (pur.sale as any).customer ? (pur.sale as any).customer.name : "Contrato";
      const devInfo = pur.sale && (pur.sale as any).device
        ? `${(pur.sale as any).device.brand} ${(pur.sale as any).device.model}`
        : "Aparelho";

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

            // Calculate projected interest for unpaid installments in Renda model
            const instValue = Number(inst.value);
            const totalPayout = instValue * Number(pur.ownership_percentage || 1);
            const totalReceivable = Number(pur.total_receivable || 0);
            const costFraction = totalReceivable > 0 ? Number(pur.purchase_price || 0) / totalReceivable : 0;
            const investorAmortization = totalPayout * costFraction;
            const investorProfit = totalPayout - investorAmortization;
            projectedInterest += investorProfit;

            upcomingPayments.push({
              id: `${pur.id}-${inst.id}`,
              type: "RENDA",
              description: `Recebível - ${devInfo}`,
              client: clientName,
              dueDate: inst.due_date,
              installmentNumber: `${inst.installment_number}/${insts.length}`,
              expectedValue: Number(shareValue.toFixed(2)),
              status: inst.status
            });

            // Add to monthly forecast
            const date = new Date(inst.due_date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const label = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(".", "");
            if (!monthlyForecastMap[key]) {
              monthlyForecastMap[key] = { month: label.toUpperCase(), amount: 0 };
            }
            monthlyForecastMap[key].amount += shareValue;
          }
        }
      }

      const projectedTotalContract = Number(pur.total_receivable) * Number(pur.ownership_percentage || 1);
      const projectedTotalProfit = Math.max(0, projectedTotalContract - Number(pur.purchase_price));

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
        projectedTotalProfit: Number(projectedTotalProfit.toFixed(2)),
        projectedTotalContract: Number(projectedTotalContract.toFixed(2)),
        status: purchaseOverdueValue > 0 ? "atrasado" : (totalRendaFuture === 0 ? "quitado" : "em dia"),
        createdAt: pur.created_at
      });
    }

    const capitalInvested = legacyCapitalInvested + primeCapitalInvested + rendaCapitalInvested;
    const roi = capitalInvested > 0 ? (interestReceived / capitalInvested) * 100 : 0;
    const delinquencyRate = totalRendaReceivable > 0 ? (totalRendaOverdue / totalRendaReceivable) * 100 : 0;

    const monthlyForecast = Object.keys(monthlyForecastMap)
      .sort()
      .map(k => ({
        month: monthlyForecastMap[k].month,
        amount: Number(monthlyForecastMap[k].amount.toFixed(2))
      }));

    const sortedUpcomingPayments = upcomingPayments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Sincronizar carteira no banco usando upsert
    const calculatedFutureReceipts = sortedUpcomingPayments.reduce((sum, item) => sum + item.expectedValue, 0) + totalRendaFuture;
    try {
      await supabase
        .from("wallets")
        .upsert({
          profile_id: profile_id,
          future_receipts: Number(calculatedFutureReceipts.toFixed(2)),
          balance: Number(walletData.balance || 0),
          updated_at: new Date().toISOString()
        }, { onConflict: 'profile_id' });
    } catch (e) {
      console.error("[syncWalletFutureReceipts] Error upserting wallet:", e);
    }

    res.json({
      wallet: {
        balance: Number(walletData.balance),
        futureReceipts: Number(calculatedFutureReceipts.toFixed(2)),
        capitalInvested,
        capitalRecovered,
        interestReceived,
        totalReceived,
        roi,
        activeDevicesCount,
        paidDevicesCount,
        defaultedDevicesCount,
        projectedInterest: Number(projectedInterest.toFixed(2))
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
        capitalPortion: Number(t.capital_portion || 0),
        interestPortion: Number(t.interest_portion || 0),
        description: t.description || "",
        date: new Date(t.created_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })
      })),
      monthlyHistory,
      monthlyForecast,
      upcomingPayments: sortedUpcomingPayments
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. POST /api/scp/withdraw — Registrar pedido de saque (investidor)
router.post("/withdraw", async (req, res) => {
  try {
    const { profile_id, amount, pix_key_type, pix_key } = req.body;
    if (!profile_id || !amount || !pix_key_type || !pix_key) {
      return res.status(400).json({ error: "Todos os campos do saque são obrigatórios." });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ error: "O valor do resgate deve ser maior que zero." });
    }

    // Verificar se o saldo do investidor é suficiente
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("profile_id", profile_id)
      .maybeSingle();

    const balance = wallet ? Number(wallet.balance) : 0;
    if (balance < Number(amount)) {
      return res.status(400).json({ error: "Saldo insuficiente para solicitar este saque." });
    }

    const { data, error } = await supabase
      .from("withdrawal_requests")
      .insert({
        profile_id,
        amount: Number(amount),
        pix_key_type,
        pix_key,
        status: "PENDING"
      })
      .select()
      .single();

    if (error) throw error;

    // Disparar notificações de saque por WhatsApp (não-bloqueante)
    (async () => {
      try {
        // 1. Obter perfil do investidor
        const { data: investorProfile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", profile_id)
          .maybeSingle();

        if (investorProfile) {
          // Buscar canal ativo do WhatsApp
          const { data: channels } = await supabase
            .from("automation_channels")
            .select("instance_name")
            .eq("status", "connected")
            .limit(1);

          const instanceName = channels && channels.length > 0 ? channels[0].instance_name : "mdr";
          const n8nUrl = process.env.N8N_SCP_WEBHOOK_URL || `${process.env.N8N_API_URL}/webhook/scp-notification`;

          // A. Notificar Investidor
          if (investorProfile.phone) {
            const cleanPhone = investorProfile.phone.replace(/\D/g, "");
            if (cleanPhone) {
              const targetPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
              const investorMessage = `*MDR PARCEIROS* 💰\n\nOlá, *${investorProfile.full_name}*!\nConfirmamos a sua solicitação de resgate:\n\n💵 *Valor:* R$ ${Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n🔑 *Chave Pix:* ${pix_key} (${pix_key_type})\n\n⏳ *Prazo de depósito:* O valor será creditado em sua conta em até *2 dias úteis*.\n\nAcompanhe o status no seu painel.`;

              await fetch(n8nUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-N8N-API-KEY": process.env.N8N_API_KEY || ""
                },
                body: JSON.stringify({
                  instanceName,
                  remoteJid: `${targetPhone}@s.whatsapp.net`,
                  text: investorMessage,
                  phone: targetPhone,
                  name: investorProfile.full_name
                })
              }).catch(e => console.error("[Withdrawal Notify Investor] Error:", e));
            }
          }

          // B. Notificar Administradores
          const { data: admins } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("role", "admin");

          if (admins && admins.length > 0) {
            for (const admin of admins) {
              if (admin.phone) {
                const cleanAdminPhone = admin.phone.replace(/\D/g, "");
                if (cleanAdminPhone) {
                  const targetAdminPhone = cleanAdminPhone.startsWith("55") ? cleanAdminPhone : `55${cleanAdminPhone}`;
                  const adminMessage = `*MDR GESTÃO SCP* ⚠️\n\nOlá, *${admin.full_name}*!\nUma nova solicitação de resgate Pix foi recebida:\n\n👤 *Investidor:* ${investorProfile.full_name}\n💵 *Valor:* R$ ${Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n🔑 *Chave Pix:* ${pix_key} (${pix_key_type})\n\nPor favor, acesse o painel administrativo para aprovar ou rejeitar.`;

                  await fetch(n8nUrl, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-N8N-API-KEY": process.env.N8N_API_KEY || ""
                    },
                    body: JSON.stringify({
                      instanceName,
                      remoteJid: `${targetAdminPhone}@s.whatsapp.net`,
                      text: adminMessage,
                      phone: targetAdminPhone,
                      name: admin.full_name
                    })
                  }).catch(e => console.error("[Withdrawal Notify Admin] Error:", e));
                }
              }
            }
          }
        }
      } catch (notifyErr) {
        console.error("[Withdrawal Notification] Exception:", notifyErr);
      }
    })();

    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. GET /api/scp/withdrawals — Listar solicitações de saque (admin ou histórico)
router.get("/withdrawals", async (req, res) => {
  try {
    const { profile_id } = req.query; // opcional para filtrar por investidor
    let query = supabase
      .from("withdrawal_requests")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false });

    if (profile_id) {
      query = query.eq("profile_id", profile_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. POST /api/scp/withdrawals/:id/approve — Aprovar saque Pix (admin)
router.post("/withdrawals/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar dados do saque
    const { data: request, error: reqErr } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (reqErr || !request) {
      return res.status(404).json({ error: "Solicitação de saque não encontrada." });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({ error: "Esta solicitação já foi processada." });
    }

    // Obter saldo atual do investidor
    const { data: wallet, error: wallErr } = await supabase
      .from("wallets")
      .select("*")
      .eq("profile_id", request.profile_id)
      .single();

    if (wallErr || !wallet) {
      return res.status(400).json({ error: "Carteira do investidor não encontrada." });
    }

    const val = Number(request.amount);

    // Deduzir o valor da carteira do investidor
    const { error: walletUpErr } = await supabase
      .from("wallets")
      .update({
        balance: Number(wallet.balance) - val,
        updated_at: new Date().toISOString()
      })
      .eq("id", wallet.id);

    if (walletUpErr) throw walletUpErr;

    // Registrar transação de WITHDRAWAL no extrato
    const { error: txErr } = await supabase
      .from("wallet_transactions")
      .insert({
        profile_id: request.profile_id,
        type: "WITHDRAWAL",
        amount: val,
        description: `Saque Pix Aprovado (${request.pix_key_type}: ${request.pix_key})`
      });

    if (txErr) throw txErr;

    // Atualizar status do saque
    const { data: updatedReq, error: statusErr } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "APPROVED",
        processed_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (statusErr) throw statusErr;

    res.json({ success: true, request: updatedReq });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. POST /api/scp/withdrawals/:id/reject — Rejeitar saque Pix (admin)
router.post("/withdrawals/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: updatedReq, error } = await supabase
      .from("withdrawal_requests")
      .update({
        status: "REJECTED",
        processed_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, request: updatedReq });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 11. GET /api/scp/available-devices — Listar aparelhos disponíveis para vincular ao lote
router.get("/available-devices", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("devices")
      .select("id, model, brand, imei, sale_price, cost_price, stock_quantity, category")
      .eq("status", "available")
      .eq("category", "smartphone")
      .is("lot_id", null)
      .is("investor_id", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 12. POST /api/scp/lots/:id/link-devices — Vincular aparelhos ao lote
router.post("/lots/:id/link-devices", async (req, res) => {
  try {
    const { id } = req.params;
    const { device_ids } = req.body; // array de strings (UUIDs)

    if (!device_ids || !Array.isArray(device_ids)) {
      return res.status(400).json({ error: "Uma lista de IDs de aparelhos é obrigatória." });
    }

    const { data, error } = await supabase
      .from("devices")
      .update({ lot_id: id })
      .in("id", device_ids)
      .select();

    if (error) throw error;
    res.json({ success: true, updatedDevices: data || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 13. POST /api/scp/quotas/:id/contract — Atualizar link do contrato da cota
router.post("/quotas/:id/contract", async (req, res) => {
  try {
    const { id } = req.params;
    const { contract_url } = req.body;

    const { data, error } = await supabase
      .from("investor_quotas")
      .update({ contract_url })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, quota: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 14. DELETE /api/scp/lots/:id — Excluir lote (se não houver cotas)
router.delete("/lots/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se existem cotas
    const { data: quotas, error: qError } = await supabase
      .from("investor_quotas")
      .select("id")
      .eq("lot_id", id);

    if (qError) throw qError;

    if (quotas && quotas.length > 0) {
      return res.status(400).json({ error: "Não é possível excluir um lote que já possui investidores vinculados." });
    }

    // Desvincular aparelhos associados
    await supabase
      .from("devices")
      .update({ lot_id: null })
      .eq("lot_id", id);

    // Excluir lote
    const { error: dError } = await supabase
      .from("lots")
      .delete()
      .eq("id", id);

    if (dError) throw dError;

    res.json({ success: true, message: "Lote excluído com sucesso!" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 15. DELETE /api/scp/quotas/:id — Remover cotista
router.delete("/quotas/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: quota, error: qError } = await supabase
      .from("investor_quotas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (qError) throw qError;
    if (!quota) {
      return res.status(404).json({ error: "Cota não encontrada." });
    }

    // Abater do future_receipts da carteira
    const { data: wallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("profile_id", quota.profile_id)
      .maybeSingle();

    if (wallet) {
      const newFutureReceipts = Math.max(0, Number(wallet.future_receipts || 0) - Number(quota.amount_invested));
      await supabase
        .from("wallets")
        .update({ future_receipts: newFutureReceipts })
        .eq("id", wallet.id);
    }

    // Excluir cota
    const { error: dError } = await supabase
      .from("investor_quotas")
      .delete()
      .eq("id", id);

    if (dError) throw dError;

    res.json({ success: true, message: "Cotista removido com sucesso!" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 16. PATCH /api/scp/devices/:id/link-investor — Vincular aparelho a investidor Prime
router.patch("/devices/:id/link-investor", async (req, res) => {
  try {
    const { id } = req.params;
    const { investor_id, prime_profit_share, prime_admin_fee } = req.body;

    const { data: device, error: devError } = await supabase
      .from("devices")
      .update({
        investor_id: investor_id || null,
        prime_profit_share: prime_profit_share !== undefined ? Number(prime_profit_share) : 0.6000,
        prime_admin_fee: prime_admin_fee !== undefined ? Number(prime_admin_fee) : 0.1000
      })
      .eq("id", id)
      .select()
      .single();

    if (devError) throw devError;

    // Se vinculou um investidor, podemos atualizar seus recebíveis futuros estimativos (preço de custo)
    if (investor_id) {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("profile_id", investor_id)
        .maybeSingle();

      const cost = Number(device.cost_price || 0);

      if (wallet) {
        await supabase
          .from("wallets")
          .update({
            future_receipts: Number(wallet.future_receipts || 0) + cost
          })
          .eq("id", wallet.id);
      } else {
        await supabase
          .from("wallets")
          .insert({
            profile_id: investor_id,
            balance: 0,
            future_receipts: cost
          });
      }
    }

    res.json({ success: true, device });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 16b. POST /api/scp/devices/link-prime-bulk — Vincular celulares em lote a investidor Prime
router.post("/devices/link-prime-bulk", async (req, res) => {
  try {
    const { investor_id, device_ids, device_quantities, prime_profit_share, prime_admin_fee, device_imeis, prime_valuation_type } = req.body;

    if (!investor_id || !Array.isArray(device_ids) || device_ids.length === 0) {
      return res.status(400).json({ error: "Parâmetros obrigatórios ausentes ou inválidos." });
    }

    const share = prime_profit_share !== undefined ? Number(prime_profit_share) / 100 : 0.6000;
    const fee = prime_admin_fee !== undefined ? Number(prime_admin_fee) / 100 : 0.1000;

    let linkedCount = 0;
    let totalCostCredited = 0;

    // Buscar os aparelhos para validar se estão disponíveis e obter todos os atributos do pai
    const { data: devices, error: devErr } = await supabase
      .from("devices")
      .select("*")
      .in("id", device_ids);

    if (devErr || !devices) {
      return res.status(400).json({ error: "Erro ao carregar aparelhos para vinculação." });
    }

    // Vincular os aparelhos desmembrando a quantidade do pai
    for (const dev of devices) {
      if (dev.investor_id) continue; // Pular se já tem investidor

      const qty = Number(device_quantities?.[dev.id] || 1);
      const originalQty = Number(dev.stock_quantity || 1);
      const newQty = Math.max(0, originalQty - qty);

      // Atualizar a quantidade em estoque do pai
      const parentStatus = newQty <= 0 ? 'sold' : dev.status;
      await supabase
        .from("devices")
        .update({
          stock_quantity: newQty,
          status: parentStatus
        })
        .eq("id", dev.id);

      // Inserir cada unidade desmembrada com quantidade = 1 e IMEI próprio
      const imeis = device_imeis?.[dev.id] || [];
      for (let i = 0; i < qty; i++) {
        const { id, created_at, updated_at, ...copiedData } = dev;
        
        const newDeviceData = {
          ...copiedData,
          stock_quantity: 1,
          status: "available",
          investor_id,
          prime_profit_share: share,
          prime_admin_fee: fee,
          imei: imeis[i] && imeis[i].trim() !== "" ? imeis[i].trim() : null,
          lot_id: null,
          prime_valuation_type: prime_valuation_type || 'sale'
        };

        const { error: insertErr } = await supabase
          .from("devices")
          .insert([newDeviceData]);

        if (insertErr) {
          console.error("Erro ao criar dispositivo desmembrado:", insertErr);
          throw insertErr;
        }

        linkedCount++;
        const deviceInvestedPrice = (prime_valuation_type === "cost")
          ? Number(dev.cost_price || 0)
          : Number(dev.sale_price || dev.cost_price || 0);
        totalCostCredited += deviceInvestedPrice;
      }
    }

    // 2. Atualizar recebíveis futuros na carteira do investidor
    if (totalCostCredited > 0) {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("profile_id", investor_id)
        .maybeSingle();

      if (wallet) {
        await supabase
          .from("wallets")
          .update({
            future_receipts: Number(wallet.future_receipts || 0) + totalCostCredited
          })
          .eq("id", wallet.id);
      } else {
        await supabase
          .from("wallets")
          .insert({
            profile_id: investor_id,
            balance: 0,
            future_receipts: totalCostCredited
          });
      }
    }

    res.json({
      success: true,
      message: `Processamento concluído com sucesso. Vinculados: ${linkedCount}.`,
      linkedCount,
      totalCostCredited
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 17. GET /api/scp/available-sales — Listar contratos de venda disponíveis para vender recebíveis
router.get("/available-sales", async (req, res) => {
  try {
    // Buscar vendas ativas que ainda não foram compradas por investidores
    const { data: purchased } = await supabase
      .from("receivable_purchases")
      .select("sale_id");

    const purchasedIds = (purchased || []).map(p => p.sale_id);

    let query = supabase
      .from("sales")
      .select("id, customer:customers(name), total_value, created_at, installments_count, device:devices(brand, model, imei)")
      .neq("status", "cancelled");

    if (purchasedIds.length > 0) {
      query = query.not("id", "in", `(${purchasedIds.join(",")})`);
    }

    const { data: sales, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    const mappedSales = (sales || []).map((s: any) => ({
      ...s,
      customer_name: s.customer?.name || "Cliente"
    }));

    res.json(mappedSales || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 18. POST /api/scp/receivables/sell — Vender recebíveis de contrato para investidor Renda
router.post("/receivables/sell", async (req, res) => {
  try {
    const { profile_id, sale_id, purchase_price, total_receivable, ownership_percentage } = req.body;

    if (!profile_id || !sale_id || !purchase_price || !total_receivable) {
      return res.status(400).json({ error: "Parâmetros obrigatórios ausentes." });
    }

    const { data: purchase, error: purError } = await supabase
      .from("receivable_purchases")
      .insert({
        profile_id,
        sale_id,
        purchase_price: Number(purchase_price),
        total_receivable: Number(total_receivable),
        ownership_percentage: ownership_percentage !== undefined ? Number(ownership_percentage) : 1.0000
      })
      .select()
      .single();

    if (purError) throw purError;

    // Atualiza o saldo de recebíveis futuros na carteira do investidor
    const { data: wallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("profile_id", profile_id)
      .maybeSingle();

    const futureAmt = Number(total_receivable) * (ownership_percentage !== undefined ? Number(ownership_percentage) : 1.0000);

    if (wallet) {
      await supabase
        .from("wallets")
        .update({
          future_receipts: Number(wallet.future_receipts || 0) + futureAmt
        })
        .eq("id", wallet.id);
    } else {
      await supabase
        .from("wallets")
        .insert({
          profile_id,
          balance: 0,
          future_receipts: futureAmt
        });
    }

    res.status(201).json({ success: true, purchase });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 19. GET /api/scp/sale-contract/:saleId — Detalhes do contrato de venda do cliente
router.get("/sale-contract/:saleId", async (req, res) => {
  try {
    const { saleId } = req.params;
    
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .select("*, customer:customers(*), device:devices(*)")
      .eq("id", saleId)
      .maybeSingle();

    if (saleError) throw saleError;
    if (!sale) return res.status(404).json({ error: "Venda não localizada." });

    const { data: installments, error: instsError } = await supabase
      .from("installments")
      .select("*")
      .eq("sale_id", saleId)
      .neq("status", "cancelled")
      .order("installment_number", { ascending: true });

    if (instsError) throw instsError;

    const { data: unit } = await supabase
      .from("units")
      .select("*")
      .eq("id", sale.store_id || "")
      .maybeSingle();

    const defaultUnit = unit || { name: "MDR Informática", cnpj: "", address: "", phone: "", contract_terms: "", warranty_terms: "" };

    res.json({
      sale: {
        id: sale.id,
        device_model: sale.device_model_manual || (sale.device ? `${sale.device.brand} ${sale.device.model}` : "Aparelho"),
        imei: sale.imei_manual || sale.device?.imei || "N/A",
        total_value: Number(sale.total_value),
        original_price: Number(sale.original_price || sale.total_value),
        down_payment: Number(sale.down_payment || 0),
        installments: Number(sale.installments_count || 12),
        service_fee: Number(sale.service_fee || 0),
        date: sale.sale_date || sale.created_at,
        device_color: sale.device?.color || "N/A",
        accessories: sale.accessories || "",
        payment_type: sale.payment_type || "crediario",
        is_trade_in: sale.is_trade_in || false,
        trade_in_valuation: Number(sale.trade_in_valuation || 0),
        trade_in_device_brand: sale.trade_in_device_brand || "",
        trade_in_device_model: sale.trade_in_device_model || "",
        trade_in_device_imei: sale.trade_in_device_imei || "",
      },
      customer: {
        name: sale.customer?.name || "Cliente",
        cpf: sale.customer?.cpf || "",
        address: sale.customer?.address || "",
        phone: sale.customer?.phone || "",
      },
      unit: defaultUnit,
      installments: (installments || []).map(i => ({
        id: i.id,
        number: i.installment_number,
        value: Number(i.value),
        due_date: i.due_date,
        status: i.status
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 20. GET /api/scp/investor-contract/:profileId — Detalhes do contrato de parceria SCP
router.get("/investor-contract/:profileId", async (req, res) => {
  try {
    const { profileId } = req.params;

    const { data: profile, error: profError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (profError) throw profError;
    if (!profile) return res.status(404).json({ error: "Perfil do investidor não localizado." });

    const { data: quotas, error: quotasError } = await supabase
      .from("investor_quotas")
      .select("id, amount_invested, ownership_percentage, lot:lots(id, title, target_amount)")
      .eq("profile_id", profileId);

    if (quotasError) throw quotasError;

    const { data: devices, error: devError } = await supabase
      .from("devices")
      .select("id, brand, model, imei, sale_price, status, cost_price")
      .eq("investor_id", profileId);

    if (devError) throw devError;

    const { data: unit } = await supabase
      .from("units")
      .select("*")
      .eq("id", profile.store_id || "")
      .maybeSingle();

    const defaultUnit = unit || { name: "MDR Informática", cnpj: "", address: "", phone: "", contract_terms: "", warranty_terms: "" };

    res.json({
      profile,
      unit: defaultUnit,
      quotas: (quotas || []).map(q => ({
        id: q.id,
        amountInvested: Number(q.amount_invested),
        ownershipPercentage: Number(q.ownership_percentage) * 100,
        lotTitle: (q.lot as any)?.title || "Lote"
      })),
      devices: (devices || []).map(d => ({
        id: d.id,
        model: `${d.brand} ${d.model}`,
        imei: d.imei || "N/A",
        salePrice: Number(d.sale_price || d.cost_price || 0),
        status: d.status
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 21. GET /api/scp/financeira-report — Relatório financeiro de rendimentos da Financeira (admin)
router.get("/financeira-report", async (req, res) => {
  try {
    // 1. Fetch all paid installments (excluding cancelled/refunded sales)
    const { data: insts, error: instsErr } = await supabase
      .from("installments")
      .select(`
        id,
        installment_number,
        total_installments,
        value,
        payment_date,
        sales (
          id,
          total_value,
          original_price,
          status,
          customer:customers (name),
          device:devices (id, brand, model, investor_id, prime_admin_fee, prime_profit_share, sale_price)
        )
      `)
      .eq("status", "paid")
      .order("payment_date", { ascending: false });

    if (instsErr) throw instsErr;

    // 2. Fetch all receivable purchases to check Renda model
    const { data: purchases, error: purErr } = await supabase
      .from("receivable_purchases")
      .select("*");
    if (purErr) throw purErr;

    // 3. Fetch all wallet transactions for paid installments
    const { data: wTxs, error: wTxsErr } = await supabase
      .from("wallet_transactions")
      .select("installment_id, amount, type");
    if (wTxsErr) throw wTxsErr;

    const reportRows: any[] = [];
    let grandTotalPaid = 0;
    let grandTotalRepassed = 0;
    let grandTotalRetained = 0;

    for (const inst of (insts || [])) {
      const sale = inst.sales as any;
      if (!sale) continue;

      // Ignore cancelled or refunded sales
      if (sale.status === 'cancelled' || sale.status === 'refunded') {
        continue;
      }

      const device = sale.device;
      const isPrime = device && device.investor_id !== null;
      
      const purchase = purchases?.find(p => p.sale_id === sale.id);
      const isRenda = !!purchase;

      if (!isPrime && !isRenda) {
        // Not an SCP sale
        continue;
      }

      // Customer paid value for this installment
      const customerPaid = Number(inst.value);

      // Total repassed to investor for this installment (sum of wallet transactions for this installment_id)
      const txsForInst = wTxs?.filter(t => t.installment_id === inst.id) || [];
      const repasse = txsForInst.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      // Financeira retained amount
      const retained = customerPaid - repasse;

      let productName = 'Produto';
      if (device) {
        productName = device.brand ? `${device.brand} ${device.model || ''}`.trim() : device.model;
      } else {
        productName = 'Recebível (Renda)';
      }

      reportRows.push({
        installmentId: inst.id,
        paymentDate: inst.payment_date,
        customerName: sale.customer?.name || 'Cliente',
        productName,
        installmentNumber: `${inst.installment_number}/${inst.total_installments}`,
        customerPaid,
        repasse,
        retained,
        type: isPrime ? 'PRIME' : 'RENDA'
      });

      grandTotalPaid += customerPaid;
      grandTotalRepassed += repasse;
      grandTotalRetained += retained;
    }

    res.json({
      summary: {
        totalPaid: Number(grandTotalPaid.toFixed(2)),
        totalRepassed: Number(grandTotalRepassed.toFixed(2)),
        totalRetained: Number(grandTotalRetained.toFixed(2))
      },
      rows: reportRows
    });
  } catch (err: any) {
    console.error('[Financeira Report] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;


