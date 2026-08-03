import express from 'express';
import { supabase } from '../lib/supabase.js';
import { processInboundWithAI } from './ai.js';
import { updateCustomerStatus } from '../utils/customerStatus.js';


const router = express.Router();

const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const EVOLUTION_API_KEY = 'MDR_SECRET_TOKEN_2024';

async function fetchWhatsAppName(instanceName: string, remoteJid: string, defaultName: string): Promise<string> {
  try {
    if (remoteJid.endsWith('@g.us')) {
      const url = `${EVOLUTION_URL}/group/findGroupInfos/${instanceName}?groupJid=${remoteJid}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'apikey': EVOLUTION_API_KEY }
      });
      if (res.ok) {
        const data: any = await res.json();
        const subject = data?.subject || data?.data?.subject;
        if (subject) return subject;
      }
    } else {
      const url = `${EVOLUTION_URL}/chat/fetchProfile/${instanceName}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({ number: remoteJid })
      });
      if (res.ok) {
        const data: any = await res.json();
        const name = data?.name || data?.pushname || data?.data?.name || data?.data?.pushname;
        if (name) return name;
      }
    }
  } catch (err: any) {
    console.error(`[Webhook] Error fetching name for ${remoteJid}:`, err?.message || err);
  }
  return defaultName;
}

// Webhook para receber mensagens da Evolution API
router.post(['/evolution', '/evolution/*'], async (req, res) => {
  const { event, instance, data } = req.body;
  
  console.log(`[Webhook] Event: ${event} | Instance: ${instance}`);

  // Evolution v2 usa MESSAGES_UPSERT ou messages.upsert
  const isMessage = event === 'MESSAGES_UPSERT' || event === 'messages.upsert';
  
  if (!isMessage) {
    console.log(`[Webhook] Event ignored: ${event}`);
    return res.status(200).send('Event ignored');
  }

  try {
    // Evolution API v2 pode aninhar em data.message ou mandar direto em data
    const messageData = data.message || data;
    
    // Log para depuração do formato real
    console.log('[Webhook] Message Data structure:', JSON.stringify(messageData).substring(0, 500));

    // Na v2, a key pode estar dentro de messageData ou no topo de data
    const key = messageData.key || data.key;
    if (!key) {
      console.warn('[Webhook] No key found in payload');
      return res.status(200).send('No message key');
    }

    const remoteJid = key.remoteJid;
    const isFromMe = key.fromMe;
    const contactName = data.pushName || messageData.pushName || remoteJid.split('@')[0];
    
    // 1. Extrair mídias e legenda
    let mediaUrl = null;
    let mediaType: 'image' | 'audio' | 'video' | 'document' | null = null;
    
    const msgObj = messageData.message || {};
    const caption = msgObj.imageMessage?.caption || 
                    msgObj.videoMessage?.caption || 
                    msgObj.documentMessage?.caption || 
                    null;

    if (msgObj.imageMessage) {
      mediaType = 'image';
      mediaUrl = data.mediaUrl || msgObj.imageMessage.url || null;
    } else if (msgObj.audioMessage) {
      mediaType = 'audio';
      mediaUrl = data.mediaUrl || msgObj.audioMessage.url || null;
    } else if (msgObj.videoMessage) {
      mediaType = 'video';
      mediaUrl = data.mediaUrl || msgObj.videoMessage.url || null;
    } else if (msgObj.documentMessage) {
      mediaType = 'document';
      mediaUrl = data.mediaUrl || msgObj.documentMessage.url || null;
    }

    // Extrair texto (suporta múltiplos formatos da v2 e mídias)
    const messageText = 
      caption ||
      messageData.message?.conversation || 
      messageData.message?.extendedTextMessage?.text || 
      messageData.conversation || 
      messageData.text || 
      messageData.content ||
      (mediaType ? `[Mídia: ${mediaType}]` : 'Mídia/Outro');

    console.log(`[Webhook] From: ${contactName} (${remoteJid}) | Text: ${messageText} | Media: ${mediaType} (${mediaUrl})`);
    
    // 2. Encontrar o canal na automation_channels
    const { data: autoChannel, error: channelErr } = await supabase
      .from('automation_channels')
      .select('*')
      .eq('instance_name', instance)
      .single();

    if (channelErr || !autoChannel) {
      console.warn(`[Webhook] Channel not found in automation_channels: ${instance}`);
      return res.status(200).send('Channel not found');
    }

    // Garantir que o canal legado usado pela FK/RLS acompanhe o canal da automação.
    const { error: legacyChannelErr } = await supabase
      .from('channels')
      .upsert([{
        id: autoChannel.id,
        name: autoChannel.name,
        unit_id: autoChannel.unit_id,
        type: autoChannel.type || 'whatsapp',
        instance_name: autoChannel.instance_name,
        status: autoChannel.status || 'connected'
      }], { onConflict: 'id' });

    if (legacyChannelErr) {
      throw legacyChannelErr;
    }

    const channel = autoChannel;
    console.log(`[Webhook] Channel ready: ${channel.id}`);

    // 3. Encontrar ou criar a conversa
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id, unread_count, contact_name')
      .eq('channel_id', channel.id)
      .eq('contact_phone', remoteJid)
      .single();

    const isUglyName = !conversation?.contact_name || 
                       conversation.contact_name.includes('@') || 
                       /^\d+$/.test(conversation.contact_name);

    if (!conversation) {
      let finalName = contactName;
      if (remoteJid.endsWith('@g.us') || isUglyName) {
        finalName = await fetchWhatsAppName(instance, remoteJid, contactName);
      }
      
      if (finalName.includes('@')) {
        finalName = finalName.split('@')[0];
      }

      const { data: newConv, error: convErr } = await supabase
        .from('conversations')
        .insert([{
          channel_id: channel.id,
          contact_name: finalName,
          contact_phone: remoteJid,
          last_message: messageText,
          last_message_at: new Date().toISOString(),
          unread_count: isFromMe ? 0 : 1
        }])
        .select()
        .single();
      
      if (convErr) throw convErr;
      conversation = newConv;
    } else {
      // Atualizar conversa existente
      const updateData: any = {
        last_message: messageText,
        last_message_at: new Date().toISOString(),
        unread_count: isFromMe ? 0 : (conversation.unread_count || 0) + 1
      };

      if (isUglyName) {
        let finalName = await fetchWhatsAppName(instance, remoteJid, conversation.contact_name || contactName);
        if (finalName.includes('@')) {
          finalName = finalName.split('@')[0];
        }
        updateData.contact_name = finalName;
      }

      await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversation.id);
    }

    // 4. Salvar a mensagem no banco (apenas se não for duplicada)
    let shouldInsertMessage = true;

    if (isFromMe) {
      // Evitar duplicações de mensagens outbound que voltam pelo webhook
      const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
      const { data: duplicate } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversation.id)
        .eq('direction', 'outbound')
        .eq('text', messageText)
        .gte('created_at', tenSecondsAgo)
        .limit(1)
        .maybeSingle();

      if (duplicate) {
        console.log(`[Webhook] Duplicate outbound message ignored: ${duplicate.id}`);
        shouldInsertMessage = false;
      }
    }

    if (shouldInsertMessage) {
      const { error: msgErr } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversation.id,
          text: messageText,
          direction: isFromMe ? 'outbound' : 'inbound',
          status: 'delivered',
          type: mediaType || 'text',
          media_url: mediaUrl,
          media_type: mediaType,
          created_at: new Date().toISOString()
        }]);

      if (msgErr) throw msgErr;
      console.log(`[Webhook] Message successfully saved to database.`);

      // 5. Disparar IA auto-respondente para mensagens inbound (async, não bloqueia)
      if (!isFromMe) {
        processInboundWithAI(
          channel.id,
          instance,
          conversation.id,
          remoteJid,
          contactName,
          messageText
        ).catch(err => console.error('[Webhook] AI processing error:', err));
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Webhook para receber eventos do Asaas
router.post('/asaas', async (req, res) => {
  const token = req.headers['asaas-access-token'];
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

  if (expectedToken && token !== expectedToken) {
    console.warn('[Asaas Webhook] Token de autenticação inválido ou ausente.');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { event, payment } = req.body;
  if (!event || !payment) {
    return res.status(400).json({ error: 'Payload inválido' });
  }

  console.log(`[Asaas Webhook] Evento recebido: ${event} | Payment ID: ${payment.id} | Ref: ${payment.externalReference}`);

  try {
    let installmentId = payment.externalReference;
    let installment: any = null;

    // 1. Localizar parcela pelo ID (externalReference) ou asaas_payment_id
    if (installmentId) {
      const { data } = await supabase
        .from('installments')
        .select('*, sales(*, customers(*), devices(*))')
        .eq('id', installmentId)
        .maybeSingle();
      installment = data;
    }

    if (!installment && payment.id) {
      const { data } = await supabase
        .from('installments')
        .select('*, sales(*, customers(*), devices(*))')
        .eq('asaas_payment_id', payment.id)
        .maybeSingle();
      installment = data;
    }

    if (!installment) {
      console.warn(`[Asaas Webhook] Parcela não encontrada para o pagamento ${payment.id} (Ref: ${payment.externalReference}). Retornando 200 para evitar penalização.`);
      return res.status(200).json({ warning: 'Installment not found in database. Ignored.' });
    }

    // 2. Processar eventos de recebimento
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      if (installment.status === 'paid') {
        console.log(`[Asaas Webhook] Parcela #${installment.installment_number} já está marcada como paga.`);
        return res.status(200).send('Already processed');
      }

      // Dar baixa na parcela no BD
      const { data: updatedInst, error: updateErr } = await supabase
        .from('installments')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString(),
          payment_method: 'pix', // Recebimento digital Asaas entra como pix/digital
          value: Number(payment.value)
        })
        .eq('id', installment.id)
        .select('*, sales(*, customers(*), devices(*))')
        .single();

      if (updateErr) {
        throw updateErr;
      }

      // Registrar no fluxo de caixa (caixa)
      const unitId = updatedInst.sales?.store_id || updatedInst.unit_id;
      const { data: activeShift } = await supabase
        .from('cash_shifts')
        .select('*')
        .eq('unit_id', unitId)
        .eq('status', 'open')
        .maybeSingle();

      // Evitar transações duplicadas
      const { data: existingTx } = await supabase
        .from('cash_transactions')
        .select('id')
        .eq('installment_id', installment.id)
        .maybeSingle();

      if (!existingTx) {
        let customerName = 'Cliente';
        if (updatedInst.sales?.customers?.name) {
          customerName = updatedInst.sales.customers.name;
        }

        const originType = updatedInst.origin_type || updatedInst.sales?.origin_type || 'CREDIARIO_LOJA';
        const cashierType = originType === 'FINANCIAMENTO_CELULAR' ? 'FINANCEIRA' : 'LOJA';

        await supabase
          .from('cash_transactions')
          .insert({
            unit_id: unitId,
            shift_id: activeShift?.id || null, // null se o caixa estiver fechado
            type: 'inflow',
            category: 'installment',
            amount: Number(payment.value),
            payment_method: 'pix',
            cashier_type: cashierType,
            description: `Recebimento Asaas (Webhook): Parcela #${updatedInst.installment_number} de ${customerName} (${cashierType === 'FINANCEIRA' ? 'Financeira' : 'Loja'})`,
            installment_id: updatedInst.id,
            created_by: activeShift?.opened_by || updatedInst.sales?.created_by || '00000000-0000-0000-0000-000000000000'
          });

        // Se o caixa estiver aberto, atualizar saldo esperado digital
        if (activeShift) {
          const updatePayload = {
            expected_digital: Number(activeShift.expected_digital || 0) + Number(payment.value)
          };
          await supabase
            .from('cash_shifts')
            .update(updatePayload)
            .eq('id', activeShift.id);
        }
      }

      console.log(`[Asaas Webhook] Parcela #${installment.installment_number} de ${installment.sales?.customers?.name || 'Cliente'} baixada com sucesso.`);

      if (updatedInst.sales?.customer_id) {
        await updateCustomerStatus(updatedInst.sales.customer_id);
      }

      // Enviar mensagem de confirmação de pagamento automatizada apenas para crediário próprio (loja)
      const storeId = updatedInst.sales?.store_id || updatedInst.unit_id;
      const isCrediario = updatedInst.sales?.payment_type === 'crediario';
      if (storeId && isCrediario) {
        try {
          const { data: store } = await supabase
            .from('stores')
            .select('name, billing_reminder_payment_confirmed_template')
            .eq('id', storeId)
            .maybeSingle();

          const { data: channel } = await supabase
            .from('automation_channels')
            .select('*')
            .eq('unit_id', storeId)
            .eq('status', 'connected')
            .limit(1)
            .maybeSingle();

          // Buscar qualquer canal conectado para garantir o disparo se o da loja atual falhar
          let activeChannelForCust = channel;
          if (!activeChannelForCust || !activeChannelForCust.instance_name || activeChannelForCust.status !== 'connected') {
            const { data: anyChannel } = await supabase
              .from('automation_channels')
              .select('*')
              .eq('status', 'connected')
              .limit(1)
              .maybeSingle();
            activeChannelForCust = anyChannel;
          }

          // 1. Envio para o Cliente
          if (activeChannelForCust && activeChannelForCust.instance_name) {
            const customerPhone = updatedInst.sales?.customers?.phone;
            if (customerPhone) {
              let cleanPhone = customerPhone.replace(/\D/g, '');
              if (!cleanPhone.startsWith('55')) {
                cleanPhone = '55' + cleanPhone;
              }
              const remoteJid = `${cleanPhone}@s.whatsapp.net`;

              const customerName = updatedInst.sales?.customers?.name || 'Cliente';
              const instVal = Number(updatedInst.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
              const instNum = updatedInst.installment_number;

              const template = store?.billing_reminder_payment_confirmed_template;
              const templateToUse = (template && template.trim()) 
                ? template 
                : "Olá, {nome}! Recebemos o seu pagamento de {valor} referente à parcela {numero}. Muito obrigado pela preferência! 🙏";

              const messageText = templateToUse
                .replace(/{nome_cliente}/gi, customerName)
                .replace(/{nome}/gi, customerName)
                .replace(/{valor_parcela}/gi, `R$ ${instVal}`)
                .replace(/{valor}/gi, `R$ ${instVal}`)
                .replace(/{numero}/gi, String(instNum))
                .replace(/{parcela_atual}/gi, String(instNum))
                .replace(/{total_parcelas}/gi, String(updatedInst.total_installments || ''))
                .replace(/{aparelho}/gi, (updatedInst.sales?.device_model_manual || 'Aparelho').replace(/\s*\(x\d+\)/gi, "").trim().toUpperCase())
                .replace(/{nome_loja}/gi, (store?.name || 'MDR Celulares').trim())
                .replace(/{data_pagamento}/gi, new Date().toLocaleDateString('pt-BR'));

              console.log(`[Asaas Webhook] Sending payment confirmation message to ${remoteJid} using instance ${activeChannelForCust.instance_name}`);
              
              const url = `${EVOLUTION_URL}/message/sendText/${activeChannelForCust.instance_name}`;
              await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': EVOLUTION_API_KEY
                },
                body: JSON.stringify({
                  number: remoteJid,
                  options: { delay: 1200, presence: 'composing' },
                  text: messageText
                })
              });
            }
          }

          // 2. Envio para o Maykon da Rosa (48999035854) - Vendas de Produtos
          if (updatedInst.sales) {
            // Buscar qualquer canal conectado para garantir o disparo se o da loja atual falhar
            let activeChannel = channel;
            if (!activeChannel || !activeChannel.instance_name || activeChannel.status !== 'connected') {
              const { data: anyChannel } = await supabase
                .from('automation_channels')
                .select('*')
                .eq('status', 'connected')
                .limit(1)
                .maybeSingle();
              activeChannel = anyChannel;
            }

            if (activeChannel && activeChannel.instance_name) {
              const maykonPhone = '5548999035854';
              const maykonJid = `${maykonPhone}@s.whatsapp.net`;

              const customerName = updatedInst.sales?.customers?.name || 'Cliente';
              const instVal = Number(updatedInst.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
              const instNum = updatedInst.installment_number;
              const totalInsts = updatedInst.total_installments;
              const paymentMethod = payment.billingType || 'PIX/Boleto';

              // Construção do nome do produto com fallback
              const deviceModel = updatedInst.sales?.devices?.model || updatedInst.sales?.device_model_manual;
              const deviceBrand = updatedInst.sales?.devices?.brand;
              const accessories = updatedInst.sales?.accessories;

              let productName = 'Produto';
              if (deviceBrand || deviceModel) {
                productName = deviceBrand ? `${deviceBrand} ${deviceModel || ''}`.trim() : deviceModel;
              } else if (accessories) {
                productName = `Acessórios: ${accessories}`;
              }

              const notifyMaykonText = `*Notificação de Pagamento (Asaas)* 💰\n\nOlá, Maykon! Um pagamento foi recebido no Asaas para uma venda de produto:\n\n👤 *Cliente:* ${customerName}\n📱 *Produto:* ${productName}\n🔢 *Parcela:* ${instNum}/${totalInsts}\n💵 *Valor Pago:* R$ ${instVal}\n💳 *Forma:* ${paymentMethod}\n📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}\n\nAcesse o painel para mais detalhes.`;

              console.log(`[Asaas Webhook] Sending payment notification to Maykon using instance ${activeChannel.instance_name}`);

              const url = `${EVOLUTION_URL}/message/sendText/${activeChannel.instance_name}`;
              await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': EVOLUTION_API_KEY
                },
                body: JSON.stringify({
                  number: maykonJid,
                  options: { delay: 1000, presence: 'composing' },
                  text: notifyMaykonText
                })
              });
            } else {
              console.warn('[Asaas Webhook] No connected channel found in the database to notify Maykon da Rosa.');
            }
          }
        } catch (msgErr) {
          console.error('[Asaas Webhook] Error sending payment notifications:', msgErr);
        }
      }
    }

    // 3. Processar eventos de atraso
    if (event === 'PAYMENT_OVERDUE') {
      if (installment.status === 'pending') {
        await supabase
          .from('installments')
          .update({ status: 'overdue' })
          .eq('id', installment.id);
        console.log(`[Asaas Webhook] Parcela #${installment.installment_number} marcada como vencida/overdue.`);
      }
    }

    res.status(200).send('OK');
  } catch (err: any) {
    console.error('[Asaas Webhook] Erro ao processar webhook do Asaas:', err);
    res.status(500).json({ error: err.message || 'Erro interno no servidor' });
  }
});

export default router;
