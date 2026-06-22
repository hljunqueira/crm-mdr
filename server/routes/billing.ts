import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Endpoint to trigger manual/individual billing reminder via n8n
router.post("/send-warning", async (req, res) => {
  try {
    const { installmentId } = req.body;

    if (!installmentId) {
      return res.status(400).json({ error: "O ID da parcela é obrigatório." });
    }

    // 1. Fetch installment details with customer and store context
    const { data: installment, error } = await supabase
      .from("installments")
      .select(`
        *,
        sales (
          device_model_manual,
          imei_manual,
          customer:customers (
            name,
            phone
          ),
          store:stores (
            name,
            phone,
            billing_reminder_template
          )
        )
      `)
      .eq("id", installmentId)
      .single();

    if (error || !installment) {
      return res.status(404).json({ error: "Parcela não encontrada." });
    }

    const sale = installment.sales;
    const customer = sale?.customer;
    const store = sale?.store;

    if (!customer?.phone) {
      return res.status(400).json({ error: "Cliente não possui telefone cadastrado." });
    }

    // 1.5. Compile the customized billing message template if available
    const DEFAULT_BILLING_REMINDER_TEMPLATE = `🔔 *Lembrete de Vencimento - {nome_loja}*\n\nOlá, {nome_cliente}! Tudo bem? 😊\n\nPassando para lembrar que a sua parcela *{parcela_atual}/{total_parcelas}* está próxima do vencimento:\n\n📱 *Aparelho:* {aparelho}\n💵 *Valor:* *{valor_parcela}*\n📅 *Vencimento:* *{data_vencimento}*\n\n🔗 *Link de Pagamento (Boleto/PIX):* {link_pagamento}\n\nPara sua comodidade, você pode realizar o pagamento pelo link acima, via *PIX* ou diretamente em nossa loja física. \n\n⚠️ *Atenção:* O pagamento em dia evita multas adicionais ou bloqueios no dispositivo.\n\nSe você já efetuou o pagamento, por favor desconsidere esta mensagem.\n\nAgradecemos a sua parceria! 🤝\n*{nome_loja}*`;

    const fillTemplate = (template: string, vars: Record<string, string | number>) => {
      let text = template;
      for (const [key, value] of Object.entries(vars)) {
        text = text.replace(new RegExp(`{${key}}`, 'gi'), String(value));
      }
      return text;
    };

    const valueStr = Number(installment.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formattedDueDate = new Date(installment.due_date + 'T12:00:00').toLocaleDateString('pt-BR');

    const variables = {
      nome_cliente: (customer.name || "").trim().toUpperCase(),
      parcela_atual: installment.number,
      total_parcelas: installment.total,
      valor_parcela: valueStr,
      aparelho: (sale?.device_model_manual || "Aparelho Celular").replace(/\s*\(x\d+\)/gi, "").trim().toUpperCase(),
      data_vencimento: formattedDueDate,
      nome_loja: (store?.name || "MDR Celulares").trim(),
      telefone_loja: store?.phone || "",
      link_pagamento: installment.asaas_invoice_url || ""
    };

    let templateText = store?.billing_reminder_template || DEFAULT_BILLING_REMINDER_TEMPLATE;
    if (!installment.asaas_invoice_url) {
      templateText = templateText.replace(/.*\{link_pagamento\}.*\n?/gi, '');
      templateText = templateText.replace(/\n{3,}/g, '\n\n');
    }
    const messageText = fillTemplate(templateText, variables);

    // 1.8. Get connected WhatsApp channel
    const { data: channels } = await supabase
      .from('automation_channels')
      .select('*')
      .eq('status', 'connected')
      .limit(1);

    if (!channels || channels.length === 0) {
      return res.status(400).json({ error: "Nenhum canal do WhatsApp conectado para disparar cobranças." });
    }

    const instance = channels[0].instance_name;
    let cleanPhone = customer.phone.replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = `55${cleanPhone}`;
    }
    const remoteJid = `${cleanPhone}@s.whatsapp.net`;

    // 2. n8n webhook payload
    const n8nPayload = {
      instanceName: instance,
      remoteJid: remoteJid,
      text: messageText,
      installment_id: installment.id,
      installment_number: installment.number,
      total_installments: installment.total,
      value: installment.value,
      due_date: installment.due_date,
      status: installment.status,
      customer_name: (customer.name || "").trim().toUpperCase(),
      customer_phone: customer.phone,
      device_model: (sale?.device_model_manual || "Aparelho Celular").replace(/\s*\(x\d+\)/gi, "").trim().toUpperCase(),
      device_imei: sale?.imei_manual || "Não Informado",
      store_name: (store?.name || "MDR Celulares").trim(),
      store_phone: store?.phone || ""
    };

    const n8nWebhookUrl = process.env.N8N_BILLING_WEBHOOK_URL || `${process.env.N8N_API_URL || 'https://n8n.mdrinformaticaecelulares.com.br'}/webhook/cobranca-crediario`;

    console.log(`[Billing Webhook] Sending payload to n8n:`, n8nPayload);

    // 3. Post to n8n webhook
    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": process.env.N8N_API_KEY || ""
      },
      body: JSON.stringify(n8nPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Billing Webhook] n8n responded with error:`, errorText);
      return res.status(502).json({ error: "Falha na comunicação com o n8n." });
    }

    res.json({ success: true, message: "Comando de cobrança enviado para o n8n!" });
  } catch (err: any) {
    console.error("[Billing Webhook] Error triggering billing warning:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
