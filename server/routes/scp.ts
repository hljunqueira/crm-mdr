import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import fetch from "node-fetch";

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
    let finalPhone = cleanPhone;
    if (!finalPhone.startsWith("55")) {
      finalPhone = `55${finalPhone}`;
    }
    const remoteJid = `${finalPhone}@s.whatsapp.net`;
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
          phone: finalPhone,
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
    const { profile_id, lot_id, amount_invested, ownership_percentage } = req.body;
    const { data, error } = await supabase
      .from("investor_quotas")
      .insert({ profile_id, lot_id, amount_invested, ownership_percentage })
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
        contract_url,
        lot:lots (
          id,
          title,
          status
        )
      `)
      .eq("profile_id", profile_id);

    if (quotasError) throw quotasError;

    const lotsList = [];

    if (quotas) {
      for (const q of quotas) {
        if (!q.lot) continue;
        const lot: any = q.lot;

        // Fetch devices in this lot
        const { data: devices, error: devError } = await supabase
          .from("devices")
          .select("id, status")
          .eq("lot_id", lot.id);

        const totalProducts = devices ? devices.length : 0;
        const soldProducts = devices ? devices.filter(d => d.status === "sold").length : 0;

        // Fetch installments for devices in this lot
        let healthRate = 100.0;
        if (devices && devices.length > 0) {
          const deviceIds = devices.map(d => d.id);
          const { data: sales, error: salesError } = await supabase
            .from("sales")
            .select("id")
            .in("device_id", deviceIds);

          if (sales && sales.length > 0) {
            const saleIds = sales.map(s => s.id);
            const { data: insts, error: instsError } = await supabase
              .from("installments")
              .select("status")
              .in("sale_id", saleIds);

            if (insts && insts.length > 0) {
              const activeInsts = insts.filter(i => i.status !== "cancelled");
              if (activeInsts.length > 0) {
                const healthyInsts = activeInsts.filter(i => i.status !== "overdue" && i.status !== "blocked");
                healthRate = Number(((healthyInsts.length / activeInsts.length) * 100).toFixed(1));
              }
            }
          }
        }

        lotsList.push({
          id: lot.id,
          quotaId: q.id,
          title: lot.title,
          amountInvested: Number(q.amount_invested),
          ownershipPercentage: Number(q.ownership_percentage) * 100, // stored as fraction e.g. 0.15
          totalProducts,
          soldProducts,
          healthRate,
          status: lot.status,
          contractUrl: q.contract_url
        });
      }
    }

    // 3. Get Recent Transactions
    const { data: transactions, error: txError } = await supabase
      .from("wallet_transactions")
      .select("id, type, amount, description, created_at")
      .eq("profile_id", profile_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (txError) throw txError;

    const formattedTransactions = (transactions || []).map((t: any) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      description: t.description || "",
      date: new Date(t.created_at).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    }));

    res.json({
      wallet: {
        balance: Number(walletData.balance),
        futureReceipts: Number(walletData.future_receipts)
      },
      lots: lotsList,
      transactions: formattedTransactions
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
      .select("id, model, brand, imei, sale_price, cost_price")
      .eq("status", "available")
      .is("lot_id", null)
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

export default router;
