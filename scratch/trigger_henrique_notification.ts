import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function run() {
  const installmentId = 'cbb9d3e0-a612-4834-a7c5-90a3da8f32ec';

  // 1. Fetch installment details
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
    console.error("Installment not found:", error);
    return;
  }

  const sale = (installment as any).sales;
  const customer = sale?.customer;
  const store = sale?.store;

  if (!customer?.phone) {
    console.error("Customer does not have a phone number.");
    return;
  }

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

  // Decide which template to use (it is paid)
  const templateText = store?.billing_reminder_payment_confirmed_template || DEFAULT_PAYMENT_CONFIRMED_TEMPLATE;
  const messageText = fillTemplate(templateText, variables);

  // 1.8. Get connected WhatsApp channel
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
    console.error("No connected WhatsApp channel found.");
    return;
  }

  const instance = channels[0].instance_name;
  
  // Format WhatsApp Jid
  let cleanPhone = customer.phone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('55')) {
    cleanPhone = '55' + cleanPhone;
  }
  const remoteJid = `${cleanPhone}@s.whatsapp.net`;

  const n8nPayload = {
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

  const n8nWebhookUrl = process.env.N8N_BILLING_WEBHOOK_URL || `${process.env.N8N_API_URL || 'https://n8n.mdrinformaticaecelulares.com.br'}/webhook/cobranca-crediario`;

  console.log("Sending payload to n8n:", n8nPayload);

  const response = await fetch(n8nWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": process.env.N8N_API_KEY || ""
    },
    body: JSON.stringify(n8nPayload)
  });

  if (response.ok) {
    console.log("Successfully triggered!");
  } else {
    console.error("Failed:", await response.text());
  }
}

run();
