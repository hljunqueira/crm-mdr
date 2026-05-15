import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Webhook para receber mensagens da Evolution API
router.post('/evolution', async (req, res) => {
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
    
    // Extrair texto (suporta múltiplos formatos da v2)
    const messageText = 
      messageData.message?.conversation || 
      messageData.message?.extendedTextMessage?.text || 
      messageData.conversation || 
      messageData.text || 
      messageData.content ||
      'Mídia/Outro';

    console.log(`[Webhook] From: ${contactName} (${remoteJid}) | Text: ${messageText}`);
    
    // 1. Encontrar o canal na automation_channels
    const { data: autoChannel, error: channelErr } = await supabase
      .from('automation_channels')
      .select('*')
      .eq('instance_name', instance)
      .single();

    if (channelErr || !autoChannel) {
      console.warn(`[Webhook] Channel not found in automation_channels: ${instance}`);
      return res.status(200).send('Channel not found');
    }

    // FIX: Garantir que o canal existe na tabela 'channels' (para satisfazer a FK da tabela conversations)
    const { data: legacyChannel } = await supabase
      .from('channels')
      .select('id')
      .eq('id', autoChannel.id)
      .single();

    if (!legacyChannel) {
      console.log(`[Webhook] Mirroring channel to legacy table for FK compatibility: ${autoChannel.id}`);
      await supabase.from('channels').upsert([{
        id: autoChannel.id,
        name: autoChannel.name,
        type: 'whatsapp',
        status: 'connected'
      }]);
    }

    const channel = autoChannel;
    console.log(`[Webhook] Channel ready: ${channel.id}`);

    // 2. Encontrar ou criar a conversa
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id, unread_count')
      .eq('channel_id', channel.id)
      .eq('contact_phone', remoteJid)
      .single();

    if (!conversation) {
      const { data: newConv, error: convErr } = await supabase
        .from('conversations')
        .insert([{
          channel_id: channel.id,
          contact_name: contactName,
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
      await supabase
        .from('conversations')
        .update({
          last_message: messageText,
          last_message_at: new Date().toISOString(),
          unread_count: isFromMe ? 0 : (conversation.unread_count || 0) + 1
        })
        .eq('id', conversation.id);
    }

    // 3. Salvar a mensagem
    const { error: msgErr } = await supabase
      .from('messages')
      .insert([{
        conversation_id: conversation.id,
        text: messageText,
        direction: isFromMe ? 'outbound' : 'inbound',
        status: 'delivered',
        created_at: new Date().toISOString()
      }]);

    if (msgErr) throw msgErr;

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
