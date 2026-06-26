import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const customerId = '5e75232c-fdcb-4ed1-bce6-4bacd044ab02'; // Andileine Ribeiro Gaspar

  // 1. Fetch customer details
  const { data: customer, error: custErr } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (custErr || !customer) {
    console.error("Cliente não encontrado:", custErr);
    return;
  }

  console.log("Customer phone in DB:", customer.phone);

  if (!customer.phone) {
    console.error("Cliente não possui telefone cadastrado.");
    return;
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
    console.error("Nenhuma parcela encontrada para este cliente:", instErr);
    return;
  }

  console.log(`Found ${installments.length} installments.`);

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
    openInsts.forEach((inst, idx) => {
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
  const { data: channels } = await supabase
    .from('automation_channels')
    .select('*')
    .eq('status', 'connected')
    .limit(1);

  if (!channels || channels.length === 0) {
    console.error("Nenhum canal do WhatsApp conectado para disparar o extrato.");
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
    customer_name: (customer.name || "").trim().toUpperCase(),
    customer_phone: customer.phone,
    store_name: storeName
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
