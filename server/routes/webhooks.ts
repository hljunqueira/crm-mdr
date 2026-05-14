import express from 'express';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Webhook para receber mensagens da Evolution API
router.post('/evolution', async (req, res) => {
  const { event, instance, data } = req.body;

  if (event !== 'messages.upsert') {
    return res.status(200).send('Event ignored');
  }

  try {
    const remoteJid = data.key.remoteJid;
    const isFromMe = data.key.fromMe;
    const contactName = data.pushName || remoteJid.split('@')[0];
    const messageText = data.message?.conversation || data.message?.extendedTextMessage?.text || 'Mídia/Outro';
    
    // 1. Encontrar o canal (pela instância)
    const { data: channel } = await supabase
      .from('channels')
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
