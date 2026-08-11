import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { formatWhatsAppJid } from "../lib/phoneHelper.js";

const router = Router();

/**
 * Função utilitária para envio unificado de mensagem WhatsApp:
 * 1. Tenta envio pelo Webhook do n8n com timeout de 6s.
 * 2. Se o n8n falhar ou estiver fora, faz fallback automático direto para a Evolution API.
 */
export async function sendWhatsAppMessageWithFallback(payload: {
  instanceName: string;
  remoteJid: string;
  text: string;
  [key: string]: any;
}): Promise<{ success: boolean; channel: 'n8n' | 'evolution'; error?: string }> {
  // Extrair número de telefone limpo (somente dígitos)
  const rawPhone = payload.remoteJid || payload.phone || payload.customer_phone || '';
  const cleanDigits = rawPhone.replace(/\D/g, '');
  const targetPhone = cleanDigits.startsWith('55') ? cleanDigits : `55${cleanDigits}`;

  const evolutionUrl = process.env.EVOLUTION_API_URL || 'https://whatsapp.mdrinformaticaecelulares.com.br';
  const evolutionApiKey = process.env.EVOLUTION_API_KEY || 'MDR_SECRET_TOKEN_2024';
  const instance = payload.instanceName || 'whatsapp_mdr_arroio';

  // 1. Tentar envio direto e instantâneo via Evolution API
  try {
    console.log(`[Messaging] Disparando mensagem via Evolution API (${instance}) para ${targetPhone}...`);
    const evoRes = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify({
        number: targetPhone,
        text: payload.text,
        linkPreview: false
      })
    });

    if (evoRes.ok) {
      console.log(`[Messaging] Sucesso! Mensagem entregue via Evolution API (${instance}) para ${targetPhone}`);
      return { success: true, channel: 'evolution' };
    }

    const evoErrText = await evoRes.text();
    console.warn(`[Messaging] Evolution API retornou HTTP ${evoRes.status}: ${evoErrText}. Tentando n8n...`);
  } catch (err: any) {
    console.warn(`[Messaging] Exceção na Evolution API: ${err.message}. Tentando n8n...`);
  }

  // 2. Fallback via n8n Webhook
  const n8nWebhookUrl = process.env.N8N_BILLING_WEBHOOK_URL || `${process.env.N8N_API_URL || 'https://n8n.mdrinformaticaecelulares.com.br'}/webhook/cobranca-crediario`;
  try {
    const n8nRes = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": process.env.N8N_API_KEY || ""
      },
      body: JSON.stringify({ ...payload, targetPhone })
    });

    if (n8nRes.ok) {
      console.log(`[Messaging] Mensagem entregue via n8n para ${targetPhone}`);
      return { success: true, channel: 'n8n' };
    }
    return { success: false, channel: 'n8n', error: `n8n HTTP ${n8nRes.status}` };
  } catch (err: any) {
    return { success: false, channel: 'n8n', error: err.message };
  }
}

// Endpoint to trigger manual/individual billing reminder via n8n/Evolution
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
            billing_reminder_template,
            billing_reminder_pre_due_template,
            billing_reminder_overdue_template,
            billing_reminder_payment_confirmed_template
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

    const DEFAULT_PAYMENT_CONFIRMED_TEMPLATE = `✅ *Confirmação de Pagamento - {nome_loja}*\n\nOlá, {nome_cliente}! Tudo bem? 😊\n\nConfirmamos o recebimento do pagamento da sua parcela *{parcela_atual}/{total_parcelas}*:\n\n📱 *Aparelho:* {aparelho}\n💵 *Valor Pago:* *{valor_parcela}*\n📅 *Data do Recebimento:* *{data_pagamento}*\n\nAgradecemos pela preferência e pela pontualidade! 🤝\n\nSe precisar de algo, estamos à disposição. 😊`;

    const fillTemplate = (template: string, vars: Record<string, string | number>) => {
      let text = template;
      for (const [key, value] of Object.entries(vars)) {
        text = text.replace(new RegExp(`{${key}}`, 'gi'), String(value));
      }
      return text;
    };

    const valueStr = Number(installment.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formattedDueDate = new Date(installment.due_date + 'T12:00:00').toLocaleDateString('pt-BR');
    const formattedPaymentDate = installment.payment_date ? new Date(installment.payment_date).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

    const variables = {
      nome_cliente: (customer.name || "").trim().toUpperCase(),
      parcela_atual: installment.installment_number,
      total_parcelas: installment.total_installments,
      valor_parcela: valueStr,
      aparelho: (sale?.device_model_manual || "Aparelho Celular").replace(/\s*\(x\d+\)/gi, "").trim().toUpperCase(),
      data_vencimento: formattedDueDate,
      data_pagamento: formattedPaymentDate,
      nome_loja: (store?.name || "MDR Celulares").trim(),
      telefone_loja: store?.phone || "",
      link_pagamento: installment.asaas_invoice_url || ""
    };

    // Decide which template to use based on installment status
    let templateText = store?.billing_reminder_template || DEFAULT_BILLING_REMINDER_TEMPLATE;

    if (installment.status === 'overdue' || installment.status === 'blocked') {
      templateText = store?.billing_reminder_overdue_template || templateText;
    } else if (installment.status === 'pending') {
      templateText = store?.billing_reminder_pre_due_template || templateText;
    } else if (installment.status === 'paid') {
      templateText = store?.billing_reminder_payment_confirmed_template || DEFAULT_PAYMENT_CONFIRMED_TEMPLATE;
    }

    if (!installment.asaas_invoice_url) {
      templateText = templateText.replace(/.*\{link_pagamento\}.*\n?/gi, '');
      templateText = templateText.replace(/\n{3,}/g, '\n\n');
    }
    const messageText = fillTemplate(templateText, variables);

    // 1.8. Get connected WhatsApp channel (try filtering by unit/store first)
    const unitId = sale?.store_id || customer?.unit_id;
    let { data: channels } = await supabase
      .from('automation_channels')
      .select('*')
      .eq('status', 'connected')
      .eq('unit_id', unitId)
      .limit(1);

    if (!channels || channels.length === 0) {
      const { data: fallbackChannels } = await supabase
        .from('automation_channels')
        .select('*')
        .eq('status', 'connected')
        .limit(1);
      channels = fallbackChannels;
    }

    if (!channels || channels.length === 0) {
      return res.status(400).json({ error: "Nenhum canal do WhatsApp conectado para disparar cobranças." });
    }

    const instance = channels[0].instance_name;
    const remoteJid = formatWhatsAppJid(customer.phone);

    // 2. Dispatch payload with fallback
    const payload = {
      instanceName: instance,
      remoteJid: remoteJid,
      text: messageText,
      installment_id: installment.id,
      installment_number: installment.installment_number,
      total_installments: installment.total_installments,
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

    const dispatchResult = await sendWhatsAppMessageWithFallback(payload);

    if (!dispatchResult.success) {
      return res.status(502).json({ error: dispatchResult.error || "Falha no envio da mensagem via WhatsApp." });
    }

    res.json({ success: true, message: `Cobrança enviada com sucesso via ${dispatchResult.channel.toUpperCase()}!` });
  } catch (err: any) {
    console.error("[Billing Webhook] Error triggering billing warning:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to send consolidated statement of installments
router.post("/send-statement", async (req, res) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: "O ID do cliente é obrigatório." });
    }

    // 1. Fetch customer details
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (custErr || !customer) {
      return res.status(404).json({ error: "Cliente não encontrado." });
    }

    if (!customer.phone) {
      return res.status(400).json({ error: "Cliente não possui telefone cadastrado." });
    }

    // 2. Fetch all active installments for this customer
    const { data: installments, error: instErr } = await supabase
      .from("installments")
      .select(`
        *,
        sales!inner (
          customer_id,
          device_model_manual,
          store:stores (
            name,
            phone
          )
        )
      `)
      .eq("sales.customer_id", customerId)
      .order("due_date", { ascending: true });

    if (instErr || !installments || installments.length === 0) {
      return res.status(404).json({ error: "Nenhuma parcela encontrada para este cliente." });
    }

    const paidInsts = installments.filter(i => i.status === "paid");
    const openInsts = installments.filter(i => i.status !== "paid");

    const totalValueOpen = openInsts.reduce((acc, cur) => acc + Number(cur.value), 0);
    const storeName = installments[0]?.sales?.store?.name || "MDR Celulares";

    // 3. Compile statement message
    let messageText = `📊 *Extrato Geral de Parcelas - ${storeName}*\n\n`;
    messageText += `Olá, *${(customer.name || "").trim().toUpperCase()}*! Tudo bem? 😊\n`;
    messageText += `Aqui está o resumo financeiro do seu crediário:\n\n`;
    messageText += `✅ *Parcelas Pagas:* ${paidInsts.length}\n`;
    messageText += `⏳ *Parcelas Pendentes:* ${openInsts.length}\n`;
    messageText += `💵 *Saldo Devedor Total:* *${totalValueOpen.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}*\n\n`;

    if (openInsts.length > 0) {
      messageText += `*PARCELAS EM ABERTO:*\n`;
      openInsts.forEach((inst) => {
        const dueDate = new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR');
        const valStr = Number(inst.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const device = inst.sales?.device_model_manual || "Celular";
        messageText += `• Parcela ${inst.installment_number}/${inst.total_installments} (${device.replace(/\s*\(x\d+\)/gi, "").trim().toUpperCase()}): *${valStr}* | Venc: *${dueDate}*\n`;
      });
      messageText += `\n`;
    }

    if (paidInsts.length > 0) {
      messageText += `*ÚLTIMAS PARCELAS QUITADAS:*\n`;
      paidInsts.slice(-5).forEach((inst) => {
        const valStr = Number(inst.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        messageText += `• Parcela ${inst.installment_number}/${inst.total_installments}: *${valStr}* - ✅ Pago\n`;
      });
      messageText += `\n`;
    }

    messageText += `Caso necessite de atendimento ou queira efetuar o pagamento via PIX, responda a esta mensagem. Obrigado! 🙏`;

    // 4. Get connected WhatsApp channel
    const unitId = customer.unit_id || installments[0]?.sales?.store_id;
    let { data: channels } = await supabase
      .from('automation_channels')
      .select('*')
      .eq('status', 'connected')
      .eq('unit_id', unitId)
      .limit(1);

    if (!channels || channels.length === 0) {
      const { data: fallbackChannels } = await supabase
        .from('automation_channels')
        .select('*')
        .eq('status', 'connected')
        .limit(1);
      channels = fallbackChannels;
    }

    if (!channels || channels.length === 0) {
      return res.status(400).json({ error: "Nenhum canal do WhatsApp conectado para disparar o extrato." });
    }

    const instance = channels[0].instance_name;
    const remoteJid = formatWhatsAppJid(customer.phone);

    // 5. Post payload with fallback
    const payload = {
      instanceName: instance,
      remoteJid: remoteJid,
      text: messageText,
      customer_name: (customer.name || "").trim().toUpperCase(),
      customer_phone: customer.phone,
      store_name: storeName
    };

    const dispatchResult = await sendWhatsAppMessageWithFallback(payload);

    if (!dispatchResult.success) {
      return res.status(502).json({ error: dispatchResult.error || "Falha ao enviar extrato via WhatsApp." });
    }

    res.json({ success: true, message: `Extrato consolidado enviado via WhatsApp (${dispatchResult.channel.toUpperCase()}) com sucesso!` });
  } catch (err: any) {
    console.error("[Statement Webhook] Error triggering statement send:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Função exportada da Régua Diária de Cobrança (usada pela rota e pelo agendador automático)
 */
export async function runDailyBillingCronTask(): Promise<{
  success: boolean;
  processed: number;
  sent: number;
  errorsCount: number;
  errors: any[];
  message: string;
}> {
  console.log("[Billing Cron] Iniciando execução da régua diária de cobrança...");

  // 1. Fetch connected WhatsApp channels
  const { data: activeChannels } = await supabase
    .from('automation_channels')
    .select('*')
    .eq('status', 'connected');

  const evolutionUrl = process.env.EVOLUTION_API_URL || 'https://whatsapp.mdrinformaticaecelulares.com.br';
  const evolutionApiKey = process.env.EVOLUTION_API_KEY || 'MDR_SECRET_TOKEN_2024';

  const validInstances = new Set<string>();

  for (const ch of activeChannels || []) {
    try {
      const stateRes = await fetch(`${evolutionUrl}/instance/connectionState/${ch.instance_name}`, {
        headers: { 'apikey': evolutionApiKey }
      });
      if (stateRes.ok) {
        const stateData: any = await stateRes.json();
        const state = stateData?.instance?.state || stateData?.state;
        if (state === 'open' || state === 'connecting' || state === 'connected') {
          validInstances.add(ch.instance_name);
        } else {
          console.warn(`[Billing Cron] Instância ${ch.instance_name} estado '${state}'. Mantendo canal no banco.`);
          validInstances.add(ch.instance_name);
        }
      } else {
        validInstances.add(ch.instance_name);
      }
    } catch (err: any) {
      console.error(`[Billing Cron] Healthcheck falhou para instância ${ch.instance_name}:`, err.message);
      validInstances.add(ch.instance_name);
    }
  }

  // 2. Fetch all unpaid installments (pending or overdue)
  const { data: installments, error: instErr } = await supabase
    .from('installments')
    .select(`
      *,
      sales!inner (
        customer_id,
        device_model_manual,
        imei_manual,
        store_id,
        customer:customers (
          name,
          phone,
          unit_id
        ),
        store:units (
          name,
          phone,
          billing_reminder_template,
          billing_reminder_pre_due_template,
          billing_reminder_overdue_template,
          billing_reminder_payment_confirmed_template
        )
      )
    `)
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true });

  if (instErr) {
    console.error("[Billing Cron] Erro ao buscar parcelas:", instErr);
    return { success: false, processed: 0, sent: 0, errorsCount: 1, errors: [instErr], message: "Erro ao buscar parcelas." };
  }

  if (!installments || installments.length === 0) {
    console.log("[Billing Cron] Nenhuma parcela pendente ou vencida encontrada.");
    return { success: true, processed: 0, sent: 0, errorsCount: 0, errors: [], message: "Nenhuma parcela pendente ou vencida para processar hoje." };
  }

  const now = new Date();
  const brDateStr = new Date(now.getTime() - 3 * 3600 * 1000).toISOString().split('T')[0];
  const todayTimestamp = new Date(`${brDateStr}T12:00:00Z`).getTime();

  let processedCount = 0;
  let sentCount = 0;
  const errors: any[] = [];

  for (const inst of installments) {
    processedCount++;
    const sale = (inst as any).sales;
    const customer = sale?.customer;
    const store = sale?.store;

    if (!customer?.phone) continue;

    const dueTimestamp = new Date(`${inst.due_date}T12:00:00Z`).getTime();
    const diffDays = Math.round((dueTimestamp - todayTimestamp) / (1000 * 60 * 60 * 24));

    let templateTag = '';
    let isDueRuleTriggered = false;
    let daysOverdue = 0;

    if (diffDays === 3) {
      isDueRuleTriggered = true;
      templateTag = 'pre_due_3';
    } else if (diffDays === 2) {
      isDueRuleTriggered = true;
      templateTag = 'pre_due_2';
    } else if (diffDays === 1) {
      isDueRuleTriggered = true;
      templateTag = 'pre_due_1';
    } else if (diffDays === 0) {
      isDueRuleTriggered = true;
      templateTag = 'due_today';
    } else if (diffDays < 0) {
      daysOverdue = Math.abs(diffDays);
      if (daysOverdue % 2 === 0) {
        isDueRuleTriggered = true;
        templateTag = `overdue_${daysOverdue}d`;
      }
    }

    if (!isDueRuleTriggered) continue;

    // Check Idempotency: Skip if already sent today for this exact rule
    if (inst.last_reminder_sent_at && String(inst.last_reminder_sent_at).startsWith(brDateStr) && inst.last_reminder_type === templateTag) {
      console.log(`[Billing Cron] Idempotência: Parcela ${inst.id} já recebeu ${templateTag} hoje.`);
      continue;
    }

    // Compile Message Text
    const storeName = (store?.name || "MDR Celulares").trim();
    const valueStr = Number(inst.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formattedDueDate = new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR');
    const deviceModel = (sale?.device_model_manual || "Aparelho Celular").replace(/\s*\(x\d+\)/gi, "").trim().toUpperCase();

    // Anti-Ban & Anti-Spam Protections:
    // 1. Varição dinâmica de saudações para evitar textos idênticos repetidos
    const GREETINGS = [
      `Olá, *${(customer.name || "").trim().toUpperCase()}*! Tudo bem com você? 😊`,
      `Oi, *${(customer.name || "").trim().toUpperCase()}*! Como vai? Esperamos que esteja tendo um ótimo dia! 😊`,
      `Olá, *${(customer.name || "").trim().toUpperCase()}*! Passando por aqui com um lembrete amigável:`,
      `Oi, *${(customer.name || "").trim().toUpperCase()}*! Tudo certinho por aí? 😊`
    ];
    const randomGreeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

    let messageText = '';

    if (diffDays === 3) {
      messageText = `🔔 *Lembrete de Vencimento - ${storeName}*\n\n${randomGreeting}\n\nPassando para lembrar que a sua parcela *${inst.installment_number}/${inst.total_installments}* vence em *3 dias* (data: *${formattedDueDate}*).\n\n📱 *Aparelho:* ${deviceModel}\n💵 *Valor:* *${valueStr}*\n`;
      if (inst.asaas_invoice_url) messageText += `\n🔗 *Link de Pagamento (PIX/Boleto):* ${inst.asaas_invoice_url}\n`;
      messageText += `\nAntecipe seu pagamento com facilidade pelo link acima ou diretamente em nossa loja física.\nTenha um ótimo dia! 🤝\n*${storeName}*`;
    } else if (diffDays === 2) {
      messageText = `⏳ *Faltam 2 Dias para o Vencimento - ${storeName}*\n\n${randomGreeting}\n\nLembrete: a sua parcela *${inst.installment_number}/${inst.total_installments}* vence em *2 dias* (data: *${formattedDueDate}*).\n\n📱 *Aparelho:* ${deviceModel}\n💵 *Valor:* *${valueStr}*\n`;
      if (inst.asaas_invoice_url) messageText += `\n🔗 *Link de Pagamento (PIX/Boleto):* ${inst.asaas_invoice_url}\n`;
      messageText += `\nPague pelo PIX ou Boleto no link acima para evitar correria no dia do vencimento.\nAgradecemos sua atenção! 🤝\n*${storeName}*`;
    } else if (diffDays === 1) {
      messageText = `⚠️ *Vence Amanhã! - ${storeName}*\n\n${randomGreeting}\n\nPassando para avisar que a sua parcela *${inst.installment_number}/${inst.total_installments}* vence *AMANHÃ* (*${formattedDueDate}*).\n\n📱 *Aparelho:* ${deviceModel}\n💵 *Valor:* *${valueStr}*\n`;
      if (inst.asaas_invoice_url) messageText += `\n🔗 *Link de Pagamento (PIX/Boleto):* ${inst.asaas_invoice_url}\n`;
      messageText += `\nGarantia de quitação em dia pelo link de pagamento acima! Estamos à disposição. 😊\n*${storeName}*`;
    } else if (diffDays === 0) {
      messageText = `📄 *Sua Fatura Vence Hoje! - ${storeName}*\n\n${randomGreeting}\n\nSua parcela *${inst.installment_number}/${inst.total_installments}* vence *HOJE* (*${formattedDueDate}*).\n\n📱 *Aparelho:* ${deviceModel}\n💵 *Valor:* *${valueStr}*\n`;
      if (inst.asaas_invoice_url) messageText += `\n🔗 *Link da Fatura (PIX/Boleto):* ${inst.asaas_invoice_url}\n`;
      messageText += `\n⚠️ *Atenção:* O pagamento em dia evita multas, juros de atraso ou restrições no dispositivo.\nQualquer dúvida, responder a esta mensagem. Obrigado pela parceria! 🤝\n*${storeName}*`;
    } else if (diffDays < 0) {
      messageText = `🚨 *Aviso de Parcela em Atraso (${daysOverdue} dias) - ${storeName}*\n\n${randomGreeting}\n\nConstamos em nosso sistema que a parcela *${inst.installment_number}/${inst.total_installments}* no valor de *${valueStr}* venceu no dia *${formattedDueDate}* e está em atraso há *${daysOverdue} dias*.\n\n📱 *Aparelho:* ${deviceModel}\n`;
      if (inst.asaas_invoice_url) messageText += `\n🔗 *Link para Regularização (PIX/Boleto):* ${inst.asaas_invoice_url}\n`;
      messageText += `\n⚠️ *Importante:* Mantenha seu crediário em dia para evitar juros adicionais e o bloqueio do aparelho.\nSe você já realizou o pagamento, favor desconsiderar este aviso e nos enviar o comprovante.\n*${storeName}*`;
    }

    // Resolve WhatsApp instance
    const unitId = sale?.store_id || customer?.unit_id;
    let targetInstance = '';

    let { data: channelList } = await supabase
      .from('automation_channels')
      .select('*')
      .eq('status', 'connected')
      .eq('unit_id', unitId)
      .limit(1);

    if (!channelList || channelList.length === 0) {
      const { data: fallbackList } = await supabase
        .from('automation_channels')
        .select('*')
        .eq('status', 'connected')
        .limit(1);
      channelList = fallbackList;
    }

    if (channelList && channelList.length > 0) {
      targetInstance = channelList[0].instance_name;
    }

    if (!targetInstance) {
      console.warn(`[Billing Cron] Nenhum canal WhatsApp conectado para a loja/unidade ${unitId}.`);
      continue;
    }

    const remoteJid = formatWhatsAppJid(customer.phone);

    const payload = {
      instanceName: targetInstance,
      remoteJid: remoteJid,
      text: messageText,
      installment_id: inst.id,
      installment_number: inst.installment_number,
      total_installments: inst.total_installments,
      value: inst.value,
      due_date: inst.due_date,
      status: inst.status,
      rule_tag: templateTag,
      days_diff: diffDays,
      customer_name: (customer.name || "").trim().toUpperCase(),
      customer_phone: customer.phone,
      device_model: deviceModel,
      device_imei: sale?.imei_manual || "Não Informado",
      store_name: storeName,
      store_phone: store?.phone || ""
    };

    console.log(`[Billing Cron] Disparando lembrete [${templateTag}] para cliente ${customer.name} (Parcela ${inst.installment_number}/${inst.total_installments})...`);

    const dispatchRes = await sendWhatsAppMessageWithFallback(payload);

    if (dispatchRes.success) {
      sentCount++;
      try {
        await supabase
          .from('installments')
          .update({
            last_reminder_sent_at: new Date().toISOString(),
            last_reminder_type: templateTag
          })
          .eq('id', inst.id);
      } catch (e) {
        console.warn(`[Billing Cron] Não foi possível atualizar idempotência na parcela ${inst.id}:`, e);
      }
    } else {
      console.error(`[Billing Cron] Falha para parcela ${inst.id}:`, dispatchRes.error);
      errors.push({ installmentId: inst.id, customer: customer.name, error: dispatchRes.error });
    }

    // Anti-Ban & Anti-Spam Protections:
    // A) Pausa a cada 5 mensagens enviadas (pausa longa de 45s a 75s)
    if (sentCount > 0 && sentCount % 5 === 0) {
      const batchPauseMs = Math.floor(Math.random() * (75000 - 45000 + 1)) + 45000;
      console.log(`[Billing Cron Anti-Spam] Lote de 5 mensagens atingido. Pausando por ${Math.round(batchPauseMs / 1000)}s para proteção da conta...`);
      await new Promise(r => setTimeout(r, batchPauseMs));
    } else {
      // B) Delay aleatório individual (entre 10s e 22s por mensagem)
      const randomDelayMs = Math.floor(Math.random() * (22000 - 10000 + 1)) + 10000;
      console.log(`[Billing Cron Anti-Spam] Aguardando ${Math.round(randomDelayMs / 1000)}s antes do próximo disparo...`);
      await new Promise(r => setTimeout(r, randomDelayMs));
    }

    // C) Teto de segurança diário: Máximo de 40 disparos automáticos por execução
    if (sentCount >= 40) {
      console.warn(`[Billing Cron Anti-Spam] Limite máximo de segurança diário atingido (40 mensagens). Interrompendo régua de hoje.`);
      break;
    }
  }

  console.log(`[Billing Cron] Execução diária concluída. Processadas: ${processedCount}, Enviadas: ${sentCount}, Erros: ${errors.length}`);

  return {
    success: true,
    processed: processedCount,
    sent: sentCount,
    errorsCount: errors.length,
    errors: errors.slice(0, 10),
    message: `Régua diária executada com sucesso! ${sentCount} lembretes disparados.`
  };
}

// Endpoint to run automated daily billing cron rule for all due/overdue installments
router.post("/run-daily-cron", async (req, res) => {
  try {
    const result = await runDailyBillingCronTask();
    res.json(result);
  } catch (err: any) {
    console.error("[Billing Cron] Exceção na régua de cobrança:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
