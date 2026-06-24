import { supabase } from "../lib/supabase.js";
import fetch from "node-fetch";

export async function processScpInstallmentPayout(installmentId: string, amountPaid: number) {
  try {
    // 1. Fetch installment, sale, customer, and device details
    const { data: installment, error: instErr } = await supabase
      .from("installments")
      .select(`
        id,
        installment_number,
        sales (
          id,
          device_id,
          installments,
          customers (
            id,
            name
          )
        )
      `)
      .eq("id", installmentId)
      .single();

    if (instErr || !installment || !installment.sales) {
      console.log(`[SCP Payout] Installment ${installmentId} has no associated sale, ignoring.`);
      return;
    }

    const sale = installment.sales as any;
    const customerName = sale.customers?.name || "Cliente";
    const deviceId = sale.device_id;
    const totalInstallments = Number(sale.installments || 1);

    if (!deviceId) {
      console.log(`[SCP Payout] Sale ${sale.id} has no associated device, ignoring.`);
      return;
    }

    // 2. Fetch device details to find the lot
    const { data: device, error: devErr } = await supabase
      .from("devices")
      .select("id, model, cost_price, lot_id")
      .eq("id", deviceId)
      .single();

    if (devErr || !device || !device.lot_id) {
      console.log(`[SCP Payout] Device ${deviceId} is not linked to any SCP lot, ignoring.`);
      return;
    }

    const deviceModel = device.model || "Smartphone";
    const costPrice = Number(device.cost_price || 0);

    // 3. Fetch lot details to get target amount (for quota ownership calculation)
    const { data: lot, error: lotErr } = await supabase
      .from("lots")
      .select("id, target_amount")
      .eq("id", device.lot_id)
      .single();

    if (lotErr || !lot || !lot.target_amount) {
      console.log(`[SCP Payout] Lot ${device.lot_id} has invalid target amount, ignoring.`);
      return;
    }

    const lotTargetAmount = Number(lot.target_amount);

    // 4. Fetch investor quotas for this lot
    const { data: quotas, error: quotasErr } = await supabase
      .from("investor_quotas")
      .select(`
        id,
        profile_id,
        amount_invested,
        interest_sharing_percentage,
        profiles (
          full_name,
          phone
        )
      `)
      .eq("lot_id", lot.id);

    if (quotasErr || !quotas || quotas.length === 0) {
      console.log(`[SCP Payout] Lot ${lot.id} has no active investor quotas.`);
      return;
    }

    // 5. Process split for each investor cota
    for (const q of quotas) {
      const investorProfile = q.profiles as any;
      const investorName = investorProfile?.full_name || "Investidor";
      const investorPhone = investorProfile?.phone;

      // Calculate investor ownership percentage of the entire lot
      const ownershipFraction = Number(q.amount_invested) / lotTargetAmount;
      const interestSharingRate = Number(q.interest_sharing_percentage ?? 0.20);

      // Capital return portion per installment (100% equivalent of the device cost)
      const totalCapitalPerInstall = costPrice / totalInstallments;
      // Proportional capital portion for this investor
      const investorShareCapital = totalCapitalPerInstall * ownershipFraction;

      // Juros/Profit portion of the paid installment (100% equivalent)
      const totalJurosPerInstall = Math.max(0, amountPaid - totalCapitalPerInstall);
      // Proportional interest portion for this investor based on their sharing rate
      const investorShareInterest = totalJurosPerInstall * interestSharingRate * ownershipFraction;

      // Total credit for this investor
      const investorRepasse = Number((investorShareCapital + investorShareInterest).toFixed(2));

      if (investorRepasse <= 0) continue;

      // Check if a transaction for this installment and investor already exists
      const { data: existingTx } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("installment_id", installmentId)
        .eq("profile_id", q.profile_id)
        .maybeSingle();

      if (existingTx) {
        console.log(`[SCP Payout] Transaction for installment ${installmentId} and investor ${q.profile_id} already exists. Skipping to prevent duplicate.`);
        continue;
      }

      // Update wallet balance and future receipts
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("profile_id", q.profile_id)
        .maybeSingle();

      if (wallet) {
        await supabase
          .from("wallets")
          .update({
            balance: Number((Number(wallet.balance) + investorRepasse).toFixed(2)),
            future_receipts: Math.max(0, Number((Number(wallet.future_receipts) - investorShareCapital).toFixed(2))),
            updated_at: new Date().toISOString()
          })
          .eq("id", wallet.id);
      } else {
        await supabase
          .from("wallets")
          .insert({
            profile_id: q.profile_id,
            balance: investorRepasse,
            future_receipts: Math.max(0, Number((Number(q.amount_invested) - investorShareCapital).toFixed(2)))
          });
      }

      // Create transaction log
      const { error: txErr } = await supabase
        .from("wallet_transactions")
        .insert({
          profile_id: q.profile_id,
          type: "CREDIT",
          amount: investorRepasse,
          capital_portion: Number(investorShareCapital.toFixed(2)),
          interest_portion: Number(investorShareInterest.toFixed(2)),
          installment_id: installmentId,
          description: `Repasse Parcela #${installment.installment_number} do celular ${deviceModel} (${customerName})`
        });

      if (txErr) {
        console.error(`[SCP Payout] Error inserting transaction log for investor ${q.profile_id}:`, txErr);
      } else {
        console.log(`[SCP Payout] Successfully credited R$ ${investorRepasse} to ${investorName} (Capital: R$ ${investorShareCapital.toFixed(2)}, Juros: R$ ${investorShareInterest.toFixed(2)})`);

        // Send WhatsApp Notification via n8n
        if (investorPhone) {
          const cleanPhone = investorPhone.replace(/\D/g, "");
          if (cleanPhone) {
            const message = `*PARCEIROS MDR* 📈\n\nOlá, *${investorName}*!\nSeu dinheiro está trabalhando. Um novo repasse foi creditado na sua carteira:\n\n📱 *Aparelho:* ${deviceModel}\n👤 *Cliente:* ${customerName}\n🔢 *Parcela:* ${installment.installment_number}/${totalInstallments}\n💵 *Crédito Recebido:* R$ ${investorRepasse.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n└ _Capital amortizado: R$ ${investorShareCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n└ _Juros recebidos: R$ ${investorShareInterest.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nAcesse seu painel em: mdrinformaticaecelulares.com.br/parceiros`;

            const n8nUrl = process.env.N8N_2FA_WEBHOOK_URL || `${process.env.N8N_API_URL}/webhook/auth-2fa`;
            try {
              // Fetch channel active instance
              const { data: channels } = await supabase
                .from("automation_channels")
                .select("instance_name")
                .eq("status", "connected")
                .limit(1);

              const instanceName = channels && channels.length > 0 ? channels[0].instance_name : "mdr";
              const targetPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

              await fetch(n8nUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-N8N-API-KEY": process.env.N8N_API_KEY || ""
                },
                body: JSON.stringify({
                  instanceName,
                  remoteJid: `${targetPhone}@s.whatsapp.net`,
                  text: message,
                  phone: targetPhone,
                  name: investorName
                })
              });
            } catch (notifyErr) {
              console.error("[SCP Payout Notification] Failed to notify via WhatsApp:", notifyErr);
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error("[SCP Payout Exception] Error during automated split processing:", err);
  }
}
