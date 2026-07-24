import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import fetch from "node-fetch";
import { formatWhatsAppJid } from "../lib/phoneHelper.js";

const router = Router();

const useSupabase = (req: any) => {
  const host = req.headers.host || '';
  return host.includes('mdrinformaticaecelulares.com.br') || 
         process.env.IS_VPS === 'true' || 
         (!host.includes('localhost') && !host.includes('127.0.0.1'));
};

// Intercept scp portal requests when offline
router.use((req, res, next) => {
  if (!useSupabase(req)) {
    return res.status(503).json({ error: "O portal de parceiros/investidores (SCP) está disponível apenas em modo online." });
  }
  next();
});


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

    // Inserir log de auditoria
    await supabase.from("scp_audit_logs").insert({
      user_id: profile.id,
      action: "login",
      details: { phone: cleanPhone },
      ip_address: (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1")
    });

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

    const credits = (allTransactions || []).filter(t => t.type === "AMORTIZATION" || t.type === "PROFIT" || t.type === "CREDIT");
    const capitalRecovered = credits.reduce((acc, t) => {
      if (t.type === "AMORTIZATION") return acc + Number(t.amount || 0);
      if (t.type === "CREDIT") return acc + Number(t.capital_portion || 0);
      return acc;
    }, 0);
    const interestReceived = credits.reduce((acc, t) => {
      if (t.type === "PROFIT") return acc + Number(t.amount || 0);
      if (t.type === "CREDIT") return acc + Number(t.interest_portion || 0);
      return acc;
    }, 0);
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

              const devTxs = credits.filter(t => t.description && t.description.includes(`Lote: ${lot.title}`));

              const devCapReturned = devTxs.reduce((sum, t) => {
                if (t.type === "AMORTIZATION") return sum + Number(t.amount || 0);
                if (t.type === "CREDIT") return sum + Number(t.capital_portion || 0);
                return sum;
              }, 0) * ownershipFraction;
              
              const devIntReceived = devTxs.reduce((sum, t) => {
                if (t.type === "PROFIT") return sum + Number(t.amount || 0);
                if (t.type === "CREDIT") return sum + Number(t.interest_portion || 0);
                return sum;
              }, 0) * ownershipFraction;

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
      .select("id, brand, model, imei, status, cost_price, sale_price, prime_profit_share, prime_profit_share_value, prime_admin_fee, prime_valuation_type, prime_profit_share_type")
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
        let devCapReturned = devTxs.reduce((sum, t) => {
          if (t.type === "AMORTIZATION") return sum + Number(t.amount || 0);
          if (t.type === "CREDIT") return sum + Number(t.capital_portion || 0);
          return sum;
        }, 0);
        
        if (devCapReturned === 0 && paidInst > 0 && totalInst > 0 && dev.prime_profit_share_type !== 'profit_only') {
          devCapReturned = paidInst * (cappedDeviceSalePrice / totalInst);
        }

        const devIntReceived = devTxs.reduce((sum, t) => {
          if (t.type === "PROFIT") return sum + Number(t.amount || 0);
          if (t.type === "CREDIT") return sum + Number(t.interest_portion || 0);
          return sum;
        }, 0);

        // Calculate projected interest & monthly forecast for unpaid installments
        const unpaidInsts = (insts || []).filter(i => i.status !== "paid");
        unpaidInsts.forEach(inst => {
          const instValue = Number(inst.value);
          
          const amortization = (saleTotal > 0 && dev.prime_profit_share_type !== 'profit_only')
            ? instValue * (cappedDeviceSalePrice / saleTotal)
            : 0;
            
          let investorProfit = 0;
          if (dev.prime_profit_share_value && Number(dev.prime_profit_share_value) > 0) {
            investorProfit = saleTotal > 0
              ? instValue * (Number(dev.prime_profit_share_value) / saleTotal)
              : 0;
          } else {
            // For profit calculation, we still need to know the base/virtual amortization to find the profit margin
            const virtualAmortization = saleTotal > 0
              ? instValue * (cappedDeviceSalePrice / saleTotal)
              : 0;
            const totalProfit = instValue - virtualAmortization;
            const adminFee = Number(dev.prime_admin_fee ?? 0.10);
            const profitShare = Number(dev.prime_profit_share ?? 0.60);
            const netProfit = totalProfit * (1.0 - adminFee);
            investorProfit = netProfit * profitShare;
          }
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
        
        let projectedTotalProfit = 0;
        if (dev.prime_profit_share_value && Number(dev.prime_profit_share_value) > 0) {
          projectedTotalProfit = Number(dev.prime_profit_share_value);
        } else {
          projectedTotalProfit = Math.max(0, netProfit * profitShare);
        }
        const projectedTotalContract = dev.prime_profit_share_type === 'profit_only'
          ? projectedTotalProfit
          : cappedDeviceSalePrice + projectedTotalProfit;

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
      .eq("profile_id", profile_id)
      .eq("status", "approved");

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

    const totalInitialCapital = legacyCapitalInvested + primeCapitalInvested + rendaCapitalInvested;
    const capitalInvested = Math.max(0, totalInitialCapital - capitalRecovered);
    const roi = totalInitialCapital > 0 ? (interestReceived / totalInitialCapital) * 100 : 0;
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
      transactions: (allTransactions || [])
        .filter((t: any) => t.type !== 'AMORTIZATION')
        .slice(0, 30)
        .map((t: any) => ({
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

    // Verificar se o saldo do investidor é suficiente (deduzindo saques pendentes se houver)
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("profile_id", profile_id)
      .maybeSingle();

    const balance = wallet ? Number(wallet.balance) : 0;
    
    // Obter saques pendentes
    const { data: pendingRequests } = await supabase
      .from("withdrawal_requests")
      .select("amount")
      .eq("profile_id", profile_id)
      .eq("status", "PENDING");

    const pendingTotal = (pendingRequests || []).reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const effectiveBalance = balance - pendingTotal;

    if (balance < Number(amount) || effectiveBalance < Number(amount)) {
      return res.status(400).json({ 
        error: `Saldo insuficiente para solicitar este saque. Saldo livre: R$ ${Math.max(0, effectiveBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.` 
      });
    }

    // Deduzir o valor da carteira imediatamente (reserva de saldo para o saque pendente)
    if (wallet) {
      const { error: walletUpErr } = await supabase
        .from("wallets")
        .update({
          balance: Number((balance - Number(amount)).toFixed(2)),
          updated_at: new Date().toISOString()
        })
        .eq("id", wallet.id);

      if (walletUpErr) throw walletUpErr;
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

    if (error) {
      // Reverter a dedução da carteira caso a inserção falhe
      if (wallet) {
        await supabase
          .from("wallets")
          .update({ balance, updated_at: new Date().toISOString() })
          .eq("id", wallet.id);
      }
      throw error;
    }

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
    const { paymentDate, receiptUrl } = req.body;

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

    const val = Number(request.amount);

    // O saldo da carteira já foi deduzido na criação do saque (PENDING).
    // Registrar transação de WITHDRAWAL no extrato para histórico definitivo.
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
        processed_at: new Date().toISOString(),
        payment_date: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        receipt_url: receiptUrl || null
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

    // Buscar dados do saque para saber o valor e investidor
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

    const refundAmount = Number(request.amount);

    // Reembolsar o valor retido de volta para a carteira do investidor
    const { data: wallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("profile_id", request.profile_id)
      .maybeSingle();

    if (wallet) {
      await supabase
        .from("wallets")
        .update({
          balance: Number((Number(wallet.balance) + refundAmount).toFixed(2)),
          updated_at: new Date().toISOString()
        })
        .eq("id", wallet.id);
    }

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

// 16. PATCH /api/scp/devices/:id/link-investor — Vincular/Editar configurações de aparelho Prime
router.patch("/devices/:id/link-investor", async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      investor_id, 
      prime_profit_share, 
      prime_admin_fee,
      prime_profit_share_value,
      prime_valuation_type,
      prime_profit_share_type,
      imei,
      sale_price,
      cost_price,
      only_cash_sale
    } = req.body;

    const { data: oldDevice } = await supabase
      .from("devices")
      .select("investor_id, cost_price, sale_price, prime_valuation_type, prime_profit_share_type")
      .eq("id", id)
      .single();

    const updatePayload: any = {};
    if (investor_id !== undefined) updatePayload.investor_id = investor_id || null;
    if (prime_profit_share !== undefined) updatePayload.prime_profit_share = Number(prime_profit_share) / 100;
    if (prime_admin_fee !== undefined) updatePayload.prime_admin_fee = Number(prime_admin_fee) / 100;
    if (prime_profit_share_value !== undefined) {
      updatePayload.prime_profit_share_value = prime_profit_share_value === '' || prime_profit_share_value === null
        ? null
        : Number(prime_profit_share_value);
    }
    if (prime_valuation_type !== undefined) updatePayload.prime_valuation_type = prime_valuation_type;
    if (prime_profit_share_type !== undefined) updatePayload.prime_profit_share_type = prime_profit_share_type;
    if (imei !== undefined) updatePayload.imei = imei || null;
    if (sale_price !== undefined) updatePayload.sale_price = Number(sale_price);
    if (cost_price !== undefined) updatePayload.cost_price = Number(cost_price);
    if (only_cash_sale !== undefined) updatePayload.only_cash_sale = Boolean(only_cash_sale);

    const { data: device, error: devError } = await supabase
      .from("devices")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (devError) throw devError;

    // Recalcular recebíveis futuros se mudou investidor, valoração ou tipo de repasse
    const oldInv = oldDevice?.investor_id;
    const newInv = device.investor_id;

    const oldCost = oldDevice
      ? (oldDevice.prime_valuation_type === "cost" ? Number(oldDevice.cost_price || 0) : Number(oldDevice.sale_price || oldDevice.cost_price || 0))
      : 0;

    const newCost = device.prime_valuation_type === "cost"
      ? Number(device.cost_price || 0)
      : Number(device.sale_price || device.cost_price || 0);

    const isOldProfitOnly = oldDevice?.prime_profit_share_type === 'profit_only';
    const isNewProfitOnly = device.prime_profit_share_type === 'profit_only';

    // Subtrair valor antigo do investidor anterior se mudou algo relevante
    if (oldInv && (!newInv || oldInv !== newInv || isOldProfitOnly !== isNewProfitOnly || oldCost !== newCost)) {
      const { data: oldWallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("profile_id", oldInv)
        .maybeSingle();

      if (oldWallet && !isOldProfitOnly) {
        await supabase
          .from("wallets")
          .update({
            future_receipts: Math.max(0, Number(oldWallet.future_receipts || 0) - oldCost)
          })
          .eq("id", oldWallet.id);
      }
    }

    // Adicionar valor ao novo investidor se necessário
    if (newInv) {
      const isSameInv = oldInv === newInv;
      const needsCrediting = !isSameInv || isOldProfitOnly !== isNewProfitOnly || oldCost !== newCost;

      if (needsCrediting && !isNewProfitOnly) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("*")
          .eq("profile_id", newInv)
          .maybeSingle();

        const amountToAdd = isSameInv 
          ? (newCost - (isOldProfitOnly ? 0 : oldCost))
          : newCost;

        if (wallet) {
          await supabase
            .from("wallets")
            .update({
              future_receipts: Math.max(0, Number(wallet.future_receipts || 0) + amountToAdd)
            })
            .eq("id", wallet.id);
        } else {
          await supabase
            .from("wallets")
            .insert({
              profile_id: newInv,
              balance: 0,
              future_receipts: amountToAdd
            });
        }
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
    const { 
      investor_id, 
      device_ids, 
      device_quantities, 
      prime_profit_share, 
      prime_admin_fee, 
      device_imeis, 
      prime_valuation_type,
      prime_profit_share_value,
      prime_profit_share_type
    } = req.body;

    if (!investor_id || !Array.isArray(device_ids) || device_ids.length === 0) {
      return res.status(400).json({ error: "Parâmetros obrigatórios ausentes ou inválidos." });
    }

    const { data: investorProf } = await supabase
      .from("profiles")
      .select("investor_profile")
      .eq("id", investor_id)
      .maybeSingle();

    const isConservador = investorProf?.investor_profile === "conservador" || investorProf?.investor_profile === "arrojado_vista";

    const share = prime_profit_share !== undefined ? Number(prime_profit_share) / 100 : 0.6000;
    const fee = prime_admin_fee !== undefined ? Number(prime_admin_fee) / 100 : 0.1000;

    let totalUnits = 0;
    for (const devId of device_ids) {
      totalUnits += Number(device_quantities?.[devId] || 1);
    }
    const unitProfitShareValue = (prime_profit_share_type === 'fixed' && totalUnits > 0 && prime_profit_share_value !== undefined)
      ? Number(prime_profit_share_value) / totalUnits
      : null;

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

    // Vincular os aparelhos
    for (const dev of devices) {
      if (dev.investor_id) continue; // Pular se já tem investidor

      const qty = Number(device_quantities?.[dev.id] || 1);
      const originalQty = Number(dev.stock_quantity || 1);
      const newQty = Math.max(0, originalQty - qty);
      const imeis = device_imeis?.[dev.id] || [];

      const deviceInvestedPrice = (prime_valuation_type === "cost")
        ? Number(dev.cost_price || 0)
        : Number(dev.sale_price || dev.cost_price || 0);

      const isProfitOnly = prime_profit_share_type === 'profit_only';

      // Se quantidade original for 1, faz update in-place para evitar erro de IMEI duplicado
      if (originalQty === 1) {
        const { error: updateErr } = await supabase
          .from("devices")
          .update({
            investor_id,
            prime_profit_share: share,
            prime_profit_share_value: unitProfitShareValue,
            prime_admin_fee: fee,
            imei: imeis[0] && imeis[0].trim() !== "" ? imeis[0].trim() : dev.imei,
            prime_valuation_type: prime_valuation_type || 'sale',
            prime_profit_share_type: prime_profit_share_type || 'percent',
            only_cash_sale: isConservador ? true : dev.only_cash_sale
          })
          .eq("id", dev.id);

        if (updateErr) throw updateErr;

        linkedCount++;
        if (!isProfitOnly) {
          totalCostCredited += deviceInvestedPrice;
        }
      } else {
        // Desmembrar normal (decrementar pai e inserir novos)
        const parentStatus = newQty <= 0 ? 'sold' : dev.status;
        const parentUpdate: any = {
          stock_quantity: newQty,
          status: parentStatus
        };
        // Se zerar o estoque do pai, renomeia o IMEI dele para liberar o constraint de IMEI único
        if (newQty <= 0 && dev.imei) {
          parentUpdate.imei = `${dev.imei}_sold`;
        }

        await supabase
          .from("devices")
          .update(parentUpdate)
          .eq("id", dev.id);

        for (let i = 0; i < qty; i++) {
          const { id, created_at, updated_at, ...copiedData } = dev;
          
          const newDeviceData = {
            ...copiedData,
            stock_quantity: 1,
            status: "available",
            investor_id,
            prime_profit_share: share,
            prime_profit_share_value: unitProfitShareValue,
            prime_admin_fee: fee,
            imei: imeis[i] && imeis[i].trim() !== "" ? imeis[i].trim() : null,
            lot_id: null,
            prime_valuation_type: prime_valuation_type || 'sale',
            prime_profit_share_type: prime_profit_share_type || 'percent',
            only_cash_sale: isConservador ? true : dev.only_cash_sale
          };

          const { error: insertErr } = await supabase
            .from("devices")
            .insert([newDeviceData]);

          if (insertErr) {
            console.error("Erro ao criar dispositivo desmembrado:", insertErr);
            throw insertErr;
          }

          linkedCount++;
          if (!isProfitOnly) {
            totalCostCredited += deviceInvestedPrice;
          }
        }
      }
      
      // Retroactive Payout check:
      // Se este celular já foi vendido anteriormente e já há parcelas pagas, creditamos retroativamente.
      const { data: sales } = await supabase
        .from("sales")
        .select("id")
        .eq("device_id", dev.id)
        .neq("status", "cancelled")
        .neq("status", "refunded");

      if (sales && sales.length > 0) {
        const saleId = sales[0].id;
        const { data: paidInstallments } = await supabase
          .from("installments")
          .select("*")
          .eq("sale_id", saleId)
          .eq("status", "paid");

        if (paidInstallments && paidInstallments.length > 0) {
          const { processScpInstallmentPayout } = require("./scp_payout_trigger");
          for (const inst of paidInstallments) {
            try {
              await processScpInstallmentPayout(inst.id, Number(inst.value));
            } catch (err) {
              console.error("Erro no repasse retroativo:", err);
            }
          }
        }
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
      .select("id, customer:customers(name), total_value, created_at, installments_count, device:devices(brand, model, imei), installments(id, status, value)")
      .neq("status", "cancelled")
      .neq("status", "refunded")
      .eq("payment_type", "crediario");

    if (purchasedIds.length > 0) {
      query = query.not("id", "in", `(${purchasedIds.join(",")})`);
    }

    const { data: sales, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    const mappedSales = (sales || [])
      .map((s: any) => {
        const unpaidInsts = (s.installments || []).filter((i: any) => i.status !== 'paid' && i.status !== 'cancelled');
        const unpaidCount = unpaidInsts.length;
        const unpaidSum = unpaidInsts.reduce((sum: number, i: any) => sum + Number(i.value), 0);
        return {
          ...s,
          customer_name: s.customer?.name || "Cliente",
          unpaid_installments_count: unpaidCount,
          remaining_receivable_value: unpaidSum
        };
      })
      .filter((s: any) => s.unpaid_installments_count > 0);

    res.json(mappedSales || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 18. POST /api/scp/receivables/sell — Vender recebíveis de contrato para investidor Renda
router.post("/receivables/sell", async (req, res) => {
  try {
    const { profile_id, sale_id, purchase_price, total_receivable, ownership_percentage } = req.body;
    // Explicita o status 'approved'
    const { data: purchase, error: purError } = await supabase
      .from("receivable_purchases")
      .insert({
        profile_id,
        sale_id,
        purchase_price: Number(purchase_price),
        total_receivable: Number(total_receivable),
        ownership_percentage: ownership_percentage !== undefined ? Number(ownership_percentage) : 1.0000,
        status: "approved"
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
          profile_id: profile_id,
          balance: 0,
          future_receipts: futureAmt
        });
    }

    res.status(201).json({ success: true, purchase });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 18b. POST /api/scp/receivables/request — Solicitar compra de recebíveis (investidor)
router.post("/receivables/request", async (req, res) => {
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
        ownership_percentage: ownership_percentage !== undefined ? Number(ownership_percentage) : 1.0000,
        status: "pending"
      })
      .select()
      .single();

    if (purError) throw purError;
    res.status(201).json({ success: true, purchase });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 18c. POST /api/scp/receivables/:id/approve — Aprovar solicitação de compra (admin)
router.post("/receivables/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: purchase, error: fetchErr } = await supabase
      .from("receivable_purchases")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !purchase) {
      return res.status(404).json({ error: "Solicitação não encontrada." });
    }

    if (purchase.status === "approved") {
      return res.status(400).json({ error: "Esta solicitação já foi aprovada." });
    }

    const { error: upErr } = await supabase
      .from("receivable_purchases")
      .update({ status: "approved" })
      .eq("id", id);

    if (upErr) throw upErr;

    // Calcular parcelas restantes não pagas
    const { data: unpaidInstallments } = await supabase
      .from("installments")
      .select("value")
      .eq("sale_id", purchase.sale_id)
      .neq("status", "paid")
      .neq("status", "cancelled");

    const unpaidSum = (unpaidInstallments || []).reduce((sum, inst) => sum + Number(inst.value), 0);
    const futureAmt = unpaidSum * Number(purchase.ownership_percentage || 1);

    // Atualizar carteira do investidor
    const { data: wallet } = await supabase
      .from("wallets")
      .select("*")
      .eq("profile_id", purchase.profile_id)
      .maybeSingle();

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
          profile_id: purchase.profile_id,
          balance: 0,
          future_receipts: futureAmt
        });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 18d. POST /api/scp/receivables/:id/reject — Rejeitar solicitação de compra (admin)
router.post("/receivables/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("receivable_purchases")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 18e. DELETE /api/scp/receivables/:id — Estornar/Deletar compra de recebíveis
router.delete("/receivables/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: purchase, error: fetchErr } = await supabase
      .from("receivable_purchases")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !purchase) {
      return res.status(404).json({ error: "Compra de recebíveis não encontrada." });
    }

    // Se estiver aprovado, deduzir os recebíveis futuros da carteira
    if (purchase.status === "approved") {
      const { data: unpaidInstallments } = await supabase
        .from("installments")
        .select("value")
        .eq("sale_id", purchase.sale_id)
        .neq("status", "paid")
        .neq("status", "cancelled");

      const unpaidSum = (unpaidInstallments || []).reduce((sum, inst) => sum + Number(inst.value), 0);
      const remainingAmt = unpaidSum * Number(purchase.ownership_percentage || 1);

      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("profile_id", purchase.profile_id)
        .maybeSingle();

      if (wallet) {
        await supabase
          .from("wallets")
          .update({
            future_receipts: Math.max(0, Number(wallet.future_receipts || 0) - remainingAmt)
          })
          .eq("id", wallet.id);
      }
    }

    // Excluir a compra do banco de dados
    const { error: delErr } = await supabase
      .from("receivable_purchases")
      .delete()
      .eq("id", id);

    if (delErr) throw delErr;
    res.json({ success: true, message: "Recebível estornado com sucesso!" });
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
      .select("id, amount_invested, ownership_percentage, lot:lots(id, title, target_amount), created_at, signed_contract_at")
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
        lotTitle: (q.lot as any)?.title || "Lote",
        createdAt: q.created_at,
        signedContractAt: q.signed_contract_at
      })),
      devices: (devices || []).map(d => ({
        id: d.id,
        model: `${d.brand} ${d.model}`,
        imei: d.imei || "N/A",
        costPrice: Number(d.cost_price || 0),
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
      .select("*")
      .eq("status", "approved");
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

      // Se for Renda, ignorar se o pagamento foi feito antes da data de criação/aprovação da compra
      if (isRenda && purchase) {
        const payDateStr = inst.payment_date ? inst.payment_date.split('T')[0] : '';
        const purchaseDateStr = purchase.created_at ? purchase.created_at.split('T')[0] : '';
        
        if (payDateStr && purchaseDateStr && payDateStr < purchaseDateStr) {
          continue;
        }
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

// ==========================================
// RECEIVABLES PLATFORM / FINTECH ENDPOINTS
// ==========================================

// 22. POST /api/scp/fintech/audit-log — Gravar log de auditoria
router.post("/fintech/audit-log", async (req, res) => {
  try {
    const { userId, action, details } = req.body;
    if (!userId || !action) {
      return res.status(400).json({ error: "userId e action são obrigatórios." });
    }

    await supabase.from("scp_audit_logs").insert({
      user_id: userId,
      action,
      details: details || {},
      ip_address: (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1")
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 23. GET /api/scp/fintech/contracts/sale/:saleId/view — Detalhar contrato de venda com log de auditoria
router.get("/fintech/contracts/sale/:saleId/view", async (req, res) => {
  try {
    const { saleId } = req.params;
    const userId = req.query.userId as string;

    const { data: sale } = await supabase
      .from("sales")
      .select("customer_name, device_model, contract_url")
      .eq("id", saleId)
      .single();

    if (userId) {
      await supabase.from("scp_audit_logs").insert({
        user_id: userId,
        action: "contract_view",
        details: { sale_id: saleId, customer_name: sale?.customer_name, device: sale?.device_model },
        ip_address: (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1")
      });
    }

    res.json({ url: sale?.contract_url || null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 24. GET /api/scp/fintech/investor/evolution/:profileId — Evolução Patrimonial histórica por mês
router.get("/fintech/investor/evolution/:profileId", async (req, res) => {
  try {
    const { profileId } = req.params;

    const { data: purchases, error: purErr } = await supabase
      .from("receivable_purchases")
      .select("purchase_price, created_at")
      .eq("profile_id", profileId)
      .eq("status", "approved");

    if (purErr) throw purErr;

    const { data: quotas, error: quotErr } = await supabase
      .from("investor_quotas")
      .select("amount_invested, created_at")
      .eq("profile_id", profileId);

    if (quotErr) throw quotErr;

    const history: { date: string; amount: number }[] = [];

    (purchases || []).forEach(p => {
      history.push({ date: p.created_at, amount: Number(p.purchase_price) });
    });
    (quotas || []).forEach(q => {
      history.push({ date: q.created_at, amount: Number(q.amount_invested) });
    });

    history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const monthlyHoldings: { [key: string]: number } = {};
    let cumulative = 0;

    history.forEach(item => {
      const monthKey = new Date(item.date).toISOString().slice(0, 7);
      cumulative += item.amount;
      monthlyHoldings[monthKey] = cumulative;
    });

    const result = Object.keys(monthlyHoldings).sort().map(month => {
      const [year, m] = month.split('-');
      const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return {
        month: `${monthsNames[parseInt(m) - 1]}/${year.slice(2)}`,
        patrimonio: Number(monthlyHoldings[month].toFixed(2))
      };
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 25. GET /api/scp/fintech/inadimplencia — Taxa de inadimplência consolidada do portfólio
router.get("/fintech/inadimplencia", async (req, res) => {
  try {
    const overdueLimit = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const { data: unpaidInstallments, error: instsErr } = await supabase
      .from("installments")
      .select("value, due_date, status, sale_id");

    if (instsErr) throw instsErr;

    const { data: purchases } = await supabase
      .from("receivable_purchases")
      .select("sale_id, ownership_percentage")
      .eq("status", "approved");

    let totalActiveReceivable = 0;
    let totalOverdueReceivable = 0;

    (unpaidInstallments || []).forEach(inst => {
      const purchase = purchases?.find(p => p.sale_id === inst.sale_id);
      if (!purchase) return;

      const shareVal = Number(inst.value) * Number(purchase.ownership_percentage);

      if (inst.status !== "paid" && inst.status !== "cancelled") {
        totalActiveReceivable += shareVal;
        if (inst.due_date < overdueLimit) {
          totalOverdueReceivable += shareVal;
        }
      }
    });

    const rate = totalActiveReceivable > 0 ? (totalOverdueReceivable / totalActiveReceivable) * 100 : 0;

    res.json({
      rate: Number(rate.toFixed(2)),
      totalActive: Number(totalActiveReceivable.toFixed(2)),
      totalOverdue: Number(totalOverdueReceivable.toFixed(2))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 26. GET /api/scp/fintech/categories/:profileId — Categoria e benefícios do parceiro investidor
router.get("/fintech/categories/:profileId", async (req, res) => {
  try {
    const { profileId } = req.params;

    const { data: purchases } = await supabase
      .from("receivable_purchases")
      .select("purchase_price")
      .eq("profile_id", profileId)
      .eq("status", "approved");

    const { data: quotas } = await supabase
      .from("investor_quotas")
      .select("amount_invested")
      .eq("profile_id", profileId);

    const totalInvested = 
      (purchases || []).reduce((sum, p) => sum + Number(p.purchase_price), 0) +
      (quotas || []).reduce((sum, q) => sum + Number(q.amount_invested), 0);

    const { data: rules } = await supabase
      .from("scp_investment_rules")
      .select("*")
      .order("min_amount", { ascending: true });

    const { data: profile } = await supabase
      .from("profiles")
      .select("custom_interest_rate, auto_reinvest, investment_category, manual_category")
      .eq("id", profileId)
      .single();

    // 1. Definir categoria ativa (manual ou automática)
    let currentCategory = "bronze";
    if (profile?.manual_category) {
      currentCategory = profile.manual_category.toLowerCase();
    } else {
      if (totalInvested >= 30000.01) {
        currentCategory = "gold";
      } else if (totalInvested >= 10000.01) {
        currentCategory = "silver";
      } else {
        currentCategory = "bronze";
      }
    }

    // 2. Mapeamento direto de taxas e benefícios
    let defaultRate = 2.0;
    let benefits: string[] = [];

    if (currentCategory === "gold" || currentCategory === "ouro") {
      defaultRate = 2.6;
      benefits = ["Prioridade máxima na compra de recebíveis", "Consultoria exclusiva", "Taxas operacionais zeradas"];
      currentCategory = "gold";
    } else if (currentCategory === "silver" || currentCategory === "prata") {
      defaultRate = 2.3;
      benefits = ["Prioridade intermediária na compra de recebíveis", "Taxas operacionais reduzidas"];
      currentCategory = "silver";
    } else {
      defaultRate = 2.0;
      benefits = ["Acesso inicial às oportunidades de recebíveis"];
      currentCategory = "bronze";
    }

    if (profile && profile.investment_category !== currentCategory) {
      await supabase
        .from("profiles")
        .update({ investment_category: currentCategory })
        .eq("id", profileId);
    }

    res.json({
      totalInvested,
      category: currentCategory,
      rate: profile?.custom_interest_rate ? Number(profile.custom_interest_rate) : defaultRate,
      isCustomRate: !!profile?.custom_interest_rate,
      autoReinvest: !!profile?.auto_reinvest,
      manualCategory: profile?.manual_category || 'auto',
      benefits
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 27. PUT /api/scp/fintech/investor-settings/:profileId — Salvar configurações de taxa de retorno, reinvestimento automático e categoria manual
router.put("/fintech/investor-settings/:profileId", async (req, res) => {
  try {
    const { profileId } = req.params;
    const { customInterestRate, autoReinvest, manualCategory } = req.body;

    const { error } = await supabase
      .from("profiles")
      .update({
        custom_interest_rate: customInterestRate === "" || customInterestRate === null ? null : Number(customInterestRate),
        auto_reinvest: !!autoReinvest,
        manual_category: manualCategory === "auto" || manualCategory === "" || manualCategory === null ? null : manualCategory
      })
      .eq("id", profileId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 28. GET /api/scp/fintech/audit-logs — Listar logs de auditoria (para admin)
router.get("/fintech/audit-logs", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("scp_audit_logs")
      .select("*, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;


