import express from 'express';
import { supabase } from '../lib/supabase.js';
import { processInboundWithAI } from './ai.js';

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
        .select('*, sales(*, customers(*))')
        .eq('id', installmentId)
        .maybeSingle();
      installment = data;
    }

    if (!installment && payment.id) {
      const { data } = await supabase
        .from('installments')
        .select('*, sales(*, customers(*))')
        .eq('asaas_payment_id', payment.id)
        .maybeSingle();
      installment = data;
    }

    if (!installment) {
      console.warn(`[Asaas Webhook] Parcela não encontrada para o pagamento ${payment.id}`);
      return res.status(404).json({ error: 'Installment not found' });
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
        .select('*, sales(*, customers(*))')
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

        await supabase
          .from('cash_transactions')
          .insert({
            unit_id: unitId,
            shift_id: activeShift?.id || null, // null se o caixa estiver fechado
            type: 'inflow',
            category: 'installment',
            amount: Number(payment.value),
            payment_method: 'pix',
            description: `Recebimento Asaas (Webhook): Parcela #${updatedInst.installment_number} de ${customerName}`,
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
