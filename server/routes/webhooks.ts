import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Webhook para receber mensagens da Evolution API
router.post('/evolution', async (req, res) => {
  const { event, instance, data } = req.body;

  // Evolution v2 usa MESSAGES_UPSERT ou messages.upsert
  const isMessage = event === 'MESSAGES_UPSERT' || event === 'messages.upsert';
  
  if (!isMessage) {
    return res.status(200).send('Event ignored');
  }

  try {
    // Na v2 as mensagens podem vir em data.message ou data (depende da config)
    const messageData = data.message || data;
    if (!messageData?.key) return res.status(200).send('No message key');

    const remoteJid = messageData.key.remoteJid;
    const isFromMe = messageData.key.fromMe;
    const contactName = messageData.pushName || remoteJid.split('@')[0];
    
    // Extrair texto (suporta v1 e v2)
    const messageText = 
      messageData.message?.conversation || 
      messageData.message?.extendedTextMessage?.text || 
      messageData.conversation || 
      messageData.text || 
      'Mídia/Outro';
    
    // 1. Encontrar o canal (pela instância) na tabela correta
    const { data: channel } = await supabase
      .from('automation_channels')
      .select('id')
      .eq('instance_name', instance)
      .single();

    if (!channel) {
      console.warn(`Webhook received for unknown instance: ${instance}`);
      return res.status(200).send('Channel not found');
    }

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
