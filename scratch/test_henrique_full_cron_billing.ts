import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testBillingForHenrique() {
  console.log('=== 1. VERIFICANDO CLIENTE HENRIQUE LINHARES JUNQUEIRA ===');
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .ilike('name', '%Henrique Linhares Junqueira%');

  if (custErr || !customers || customers.length === 0) {
    console.error('Erro ao buscar cliente Henrique Linhares Junqueira:', custErr);
    return;
  }

  const customer = customers[0];
  console.log(`Cliente Encontrado: ${customer.name}`);
  console.log(`Telefone: ${customer.phone}`);
  console.log(`ID: ${customer.id}`);

  console.log('\n=== 2. VERIFICANDO PARCELAS DO CLIENTE ===');
  const { data: installments, error: instErr } = await supabase
    .from('installments')
    .select(`
      *,
      sales!inner (
        customer_id,
        device_model_manual,
        imei_manual,
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
    .eq('sales.customer_id', customer.id)
    .order('due_date', { ascending: true });

  if (instErr || !installments || installments.length === 0) {
    console.error('Nenhuma parcela encontrada para Henrique Linhares Junqueira:', instErr);
    return;
  }

  const pending = installments.filter(i => i.status === 'pending');
  const overdue = installments.filter(i => i.status === 'overdue');
  const paid = installments.filter(i => i.status === 'paid');

  console.log(`Total de Parcelas: ${installments.length}`);
  console.log(`- Pendentes: ${pending.length}`);
  console.log(`- Vencidas (Overdue): ${overdue.length}`);
  console.log(`- Pagas: ${paid.length}`);

  const targetInstallment = pending[0] || installments[0];
  console.log(`\nParcela Selecionada para Teste de Lembrete:`);
  console.log(`- ID: ${targetInstallment.id}`);
  console.log(`- N°: ${targetInstallment.installment_number}/${targetInstallment.total_installments}`);
  console.log(`- Valor: R$ ${targetInstallment.value}`);
  console.log(`- Vencimento: ${targetInstallment.due_date}`);
  console.log(`- Status: ${targetInstallment.status}`);
  console.log(`- Asaas URL: ${targetInstallment.asaas_invoice_url || 'N/A'}`);

  console.log('\n=== 3. VERIFICANDO CANAL WHATSAPP CONECTADO ===');
  const { data: channels, error: channelErr } = await supabase
    .from('automation_channels')
    .select('*')
    .eq('status', 'connected')
    .limit(1);

  if (channelErr || !channels || channels.length === 0) {
    console.error('Nenhum canal WhatsApp ativo/conectado encontrado!');
    return;
  }
  const channel = channels[0];
  console.log(`Canal Conectado: ${channel.name} (${channel.instance_name})`);

  console.log('\n=== 4. TESTANDO DISPARO DO LEMBRETE DE VENCIMENTO ===');
  const sale = targetInstallment.sales;
  const store = sale?.store;

  const DEFAULT_BILLING_REMINDER_TEMPLATE = `🔔 *Lembrete de Vencimento - {nome_loja}*\n\nOlá, {nome_cliente}! Tudo bem? 😊\n\nPassando para lembrar que a sua parcela *{parcela_atual}/{total_parcelas}* está próxima do vencimento:\n\n📱 *Aparelho:* {aparelho}\n💵 *Valor:* *{valor_parcela}*\n📅 *Vencimento:* *{data_vencimento}*\n\n🔗 *Link de Pagamento (Boleto/PIX):* {link_pagamento}\n\nPara sua comodidade, você pode realizar o pagamento pelo link acima, via *PIX* ou diretamente em nossa loja física. \n\n⚠️ *Atenção:* O pagamento em dia evita multas adicionais ou bloqueios no dispositivo.\n\nSe você já efetuou o pagamento, por favor desconsidere esta mensagem.\n\nAgradecemos a sua parceria! 🤝\n*{nome_loja}*`;

  const fillTemplate = (template: string, vars: Record<string, string | number>) => {
    let text = template;
    for (const [key, value] of Object.entries(vars)) {
      text = text.replace(new RegExp(`{${key}}`, 'gi'), String(value));
    }
    return text;
  };

  const valueStr = Number(targetInstallment.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formattedDueDate = new Date(targetInstallment.due_date + 'T12:00:00').toLocaleDateString('pt-BR');

  const variables = {
    nome_cliente: (customer.name || "").trim().toUpperCase(),
    parcela_atual: targetInstallment.installment_number,
    total_parcelas: targetInstallment.total_installments,
    valor_parcela: valueStr,
    aparelho: (sale?.device_model_manual || "Aparelho Celular").replace(/\s*\(x\d+\)/gi, "").trim().toUpperCase(),
    data_vencimento: formattedDueDate,
    nome_loja: (store?.name || "MDR Celulares").trim(),
    telefone_loja: store?.phone || "",
    link_pagamento: targetInstallment.asaas_invoice_url || ""
  };

  let templateText = store?.billing_reminder_template || DEFAULT_BILLING_REMINDER_TEMPLATE;
  if (!targetInstallment.asaas_invoice_url) {
    templateText = templateText.replace(/.*\{link_pagamento\}.*\n?/gi, '');
    templateText = templateText.replace(/\n{3,}/g, '\n\n');
  }
  const messageText = fillTemplate(templateText, variables);

  let cleanPhone = customer.phone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('55')) {
    cleanPhone = '55' + cleanPhone;
  }
  const remoteJid = `${cleanPhone}@s.whatsapp.net`;

  const n8nPayloadWarning = {
    instanceName: channel.instance_name,
    remoteJid: remoteJid,
    text: messageText,
    installment_id: targetInstallment.id,
    installment_number: targetInstallment.installment_number,
    total_installments: targetInstallment.total_installments,
    value: targetInstallment.value,
    due_date: targetInstallment.due_date,
    status: targetInstallment.status,
    customer_name: (customer.name || "").trim().toUpperCase(),
    customer_phone: customer.phone,
    device_model: (sale?.device_model_manual || "Aparelho Celular").replace(/\s*\(x\d+\)/gi, "").trim().toUpperCase(),
    device_imei: sale?.imei_manual || "Não Informado",
    store_name: (store?.name || "MDR Celulares").trim(),
    store_phone: store?.phone || ""
  };

  const n8nWebhookUrl = process.env.N8N_BILLING_WEBHOOK_URL || `${process.env.N8N_API_URL || 'https://n8n.mdrinformaticaecelulares.com.br'}/webhook/cobranca-crediario`;

  console.log(`Enviando Payload de Lembrete para n8n (${n8nWebhookUrl})...`);
  const resWarning = await fetch(n8nWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": process.env.N8N_API_KEY || ""
    },
    body: JSON.stringify(n8nPayloadWarning)
  });

  console.log(`Status Resposta Lembrete: ${resWarning.status} - ${resWarning.statusText}`);
  const warningResBody = await resWarning.text();
  console.log(`Corpo Resposta Lembrete: ${warningResBody}`);

  console.log('\n=== 5. TESTANDO DISPARO DE EXTRATO CONSOLIDADO ===');
  const openInsts = installments.filter(i => i.status !== 'paid');
  const paidInsts = installments.filter(i => i.status === 'paid');
  const totalValueOpen = openInsts.reduce((acc, cur) => acc + Number(cur.value), 0);
  const storeName = (store?.name || "MDR Celulares").trim();

  let statementMsg = `📊 *Extrato Geral de Parcelas - ${storeName}*\n\n`;
  statementMsg += `Olá, *${(customer.name || "").trim().toUpperCase()}*! Tudo bem? 😊\n`;
  statementMsg += `Aqui está o resumo financeiro do seu crediário:\n\n`;
  statementMsg += `✅ *Parcelas Pagas:* ${paidInsts.length}\n`;
  statementMsg += `⏳ *Parcelas Pendentes:* ${openInsts.length}\n`;
  statementMsg += `💵 *Saldo Devedor Total:* *${totalValueOpen.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}*\n\n`;

  if (openInsts.length > 0) {
    statementMsg += `*PARCELAS EM ABERTO:*\n`;
    openInsts.slice(0, 5).forEach((inst) => {
      const dueDate = new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR');
      const valStr = Number(inst.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const device = inst.sales?.device_model_manual || "Celular";
      statementMsg += `• Parcela ${inst.installment_number}/${inst.total_installments} (${device.replace(/\s*\(x\d+\)/gi, "").trim().toUpperCase()}): *${valStr}* | Venc: *${dueDate}*\n`;
    });
    statementMsg += `\n`;
  }

  statementMsg += `Caso necessite de atendimento ou queira efetuar o pagamento via PIX, responda a esta mensagem. Obrigado! 🙏`;

  const n8nPayloadStatement = {
    instanceName: channel.instance_name,
    remoteJid: remoteJid,
    text: statementMsg,
    customer_name: (customer.name || "").trim().toUpperCase(),
    customer_phone: customer.phone,
    store_name: storeName
  };

  console.log(`Enviando Payload de Extrato para n8n...`);
  const resStatement = await fetch(n8nWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": process.env.N8N_API_KEY || ""
    },
    body: JSON.stringify(n8nPayloadStatement)
  });

  console.log(`Status Resposta Extrato: ${resStatement.status} - ${resStatement.statusText}`);
  const statementResBody = await resStatement.text();
  console.log(`Corpo Resposta Extrato: ${statementResBody}`);

  console.log('\n=== TESTES CONCLUÍDOS COM SUCESSO ===');
}

testBillingForHenrique().catch(console.error);
