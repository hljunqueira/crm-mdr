import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const installmentId = '35b82f38-0b42-4a85-af79-a380ccbce3bd';

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

  const sale = installment.sales;
  const customer = sale?.customer;
  const store = sale?.store;

  if (!customer?.phone) {
    console.error("Cliente não possui telefone cadastrado.");
    return;
  }

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

  let templateText = store?.billing_reminder_template || DEFAULT_BILLING_REMINDER_TEMPLATE;
  if (installment.status === 'overdue' || installment.status === 'blocked') {
    templateText = store?.billing_reminder_overdue_template || templateText;
  } else if (installment.status === 'pending') {
    templateText = store?.billing_reminder_pre_due_template || templateText;
  }

  if (!installment.asaas_invoice_url) {
    templateText = templateText.replace(/.*\{link_pagamento\}.*\n?/gi, '');
    templateText = templateText.replace(/\n{3,}/g, '\n\n');
  }
  const messageText = fillTemplate(templateText, variables);

  const { data: channels } = await supabase
    .from('automation_channels')
    .select('*')
    .eq('status', 'connected')
    .limit(1);

  if (!channels || channels.length === 0) {
    console.error("Nenhum canal do WhatsApp conectado.");
    return;
  }

  const instance = channels[0].instance_name;
  let cleanPhone = customer.phone.replace(/\D/g, '');
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = `55${cleanPhone}`;
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

  console.log('Sending payload to n8n:', JSON.stringify(n8nPayload, null, 2));
  console.log('Webhook URL:', n8nWebhookUrl);

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": process.env.N8N_API_KEY || ""
      },
      body: JSON.stringify(n8nPayload)
    });

    console.log('n8n Response Status:', response.status);
    const responseText = await response.text();
    console.log('n8n Response Body:', responseText);
  } catch (err: any) {
    console.error('Fetch error:', err);
  }
}

run();
