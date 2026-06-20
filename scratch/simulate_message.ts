import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('Fetching a pending installment to simulate...');
  const { data: installments, error } = await supabase
    .from('installments')
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
    .eq('status', 'pending')
    .limit(1);

  if (error || !installments || installments.length === 0) {
    console.error('Error fetching pending installment or none found:', error);
    return;
  }

  const inst = installments[0];
  const sale = inst.sales;
  const customer = sale?.customer;
  const store = sale?.store;

  const DEFAULT_BILLING_REMINDER_TEMPLATE = `🔔 *Lembrete de Vencimento - {nome_loja}*\n\nOlá, {nome_cliente}! Tudo bem? 😊\n\nPassando para lembrar que a sua parcela *{parcela_atual}/{total_parcelas}* está próxima do vencimento:\n\n📱 *Aparelho:* {aparelho}\n💵 *Valor:* *{valor_parcela}*\n📅 *Vencimento:* *{data_vencimento}*\n\n🔗 *Link de Pagamento (Boleto/PIX):* {link_pagamento}\n\nPara sua comodidade, você pode realizar o pagamento pelo link acima, via *PIX* ou diretamente em nossa loja física. \n\n⚠️ *Atenção:* O pagamento em dia evita multas adicionais ou bloqueios no dispositivo.\n\nSe você já efetuou o pagamento, por favor desconsidere esta mensagem.\n\nAgradecemos a sua parceria! 🤝\n*{nome_loja}*`;

  const fillTemplate = (template: string, vars: Record<string, string | number>) => {
    let text = template;
    for (const [key, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(`{${key}}`, 'gi'), String(value));
    }
    return text;
  };

  const valueStr = Number(inst.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedDueDate = new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR');

  // --- SCENARIO 1: Link is present ---
  console.log('\n--- SCENARIO 1: Link is present ---');
  const mockInvoiceUrl = "https://www.asaas.com/i/1234567890";
  const variablesWithLink = {
    nome_cliente: (customer?.name || "Cliente Teste").trim().toUpperCase(),
    parcela_atual: inst.installment_number || inst.number,
    total_parcelas: inst.total_installments || inst.total,
    valor_parcela: valueStr,
    aparelho: (sale?.device_model_manual || "Aparelho Celular").replace(/\s*\(x\d+\)/gi, "").trim().toUpperCase(),
    data_vencimento: formattedDueDate,
    nome_loja: (store?.name || "MDR Celulares").trim(),
    telefone_loja: store?.phone || "",
    link_pagamento: mockInvoiceUrl
  };
  
  let templateText1 = store?.billing_reminder_template || DEFAULT_BILLING_REMINDER_TEMPLATE;
  const messageText1 = fillTemplate(templateText1, variablesWithLink);
  console.log(messageText1);
  console.log('------------------------------------\n');

  // --- SCENARIO 2: Link is missing ---
  console.log('--- SCENARIO 2: Link is missing ---');
  const variablesWithoutLink = {
    nome_cliente: (customer?.name || "Cliente Teste").trim().toUpperCase(),
    parcela_atual: inst.installment_number || inst.number,
    total_parcelas: inst.total_installments || inst.total,
    valor_parcela: valueStr,
    aparelho: (sale?.device_model_manual || "Aparelho Celular").replace(/\s*\(x\d+\)/gi, "").trim().toUpperCase(),
    data_vencimento: formattedDueDate,
    nome_loja: (store?.name || "MDR Celulares").trim(),
    telefone_loja: store?.phone || "",
    link_pagamento: ""
  };
  
  let templateText2 = store?.billing_reminder_template || DEFAULT_BILLING_REMINDER_TEMPLATE;
  if (!variablesWithoutLink.link_pagamento) {
    templateText2 = templateText2.replace(/.*\{link_pagamento\}.*\n?/gi, '');
    templateText2 = templateText2.replace(/\n{3,}/g, '\n\n');
  }
  const messageText2 = fillTemplate(templateText2, variablesWithoutLink);
  console.log(messageText2);
  console.log('------------------------------------\n');

  // Trigger N8N webhook with the real data (or mock link) for target phone
  const n8nWebhookUrl = "https://n8n.mdrinformaticaecelulares.com.br/webhook/cobranca-crediario";
  const targetPhone = "5548991013293";
  const remoteJid = `${targetPhone}@s.whatsapp.net`;
  const instance = "whatsapp_mdr_arroio";

  // Use the actual url if exists, otherwise mock it for this WhatsApp notification test
  const finalInvoiceUrl = inst.asaas_invoice_url || mockInvoiceUrl;
  const finalVariables = {
    nome_cliente: (customer?.name || "Cliente Teste").trim().toUpperCase(),
    parcela_atual: inst.installment_number || inst.number,
    total_parcelas: inst.total_installments || inst.total,
    valor_parcela: valueStr,
    aparelho: (sale?.device_model_manual || "Aparelho Celular").replace(/\s*\(x\d+\)/gi, "").trim().toUpperCase(),
    data_vencimento: formattedDueDate,
    nome_loja: (store?.name || "MDR Celulares").trim(),
    telefone_loja: store?.phone || "",
    link_pagamento: finalInvoiceUrl
  };

  let finalTemplate = store?.billing_reminder_template || DEFAULT_BILLING_REMINDER_TEMPLATE;
  if (!finalInvoiceUrl) {
    finalTemplate = finalTemplate.replace(/.*\{link_pagamento\}.*\n?/gi, '');
    finalTemplate = finalTemplate.replace(/\n{3,}/g, '\n\n');
  }
  const finalMessageText = fillTemplate(finalTemplate, finalVariables);

  const n8nPayload = {
    instanceName: instance,
    remoteJid: remoteJid,
    text: finalMessageText,
    customerName: (customer?.name || "Cliente Teste").trim().toUpperCase(),
    installmentNumber: `${inst.installment_number || inst.number}/${inst.total_installments || inst.total}`,
    dueDate: formattedDueDate,
    value: valueStr
  };

  console.log(`Sending payload to n8n at: ${n8nWebhookUrl}`);
  try {
    const res = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
      },
      body: JSON.stringify(n8nPayload)
    });

    if (res.ok) {
      console.log('Webhook triggered successfully!');
    } else {
      console.error(`Error triggering webhook: ${res.status} - ${await res.text()}`);
    }
  } catch (err: any) {
    console.error('Network error triggering webhook:', err.message);
  }
}

run();
