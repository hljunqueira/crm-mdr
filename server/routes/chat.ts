import { Router } from 'express';

const router = Router();

const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const EVOLUTION_API_KEY = 'MDR_SECRET_TOKEN_2024';

// POST /api/chat/send — Envio seguro de mensagem de texto via Evolution API
router.post('/send', async (req, res) => {
  try {
    const { instanceName, remoteJid, text } = req.body;

    if (!instanceName || !remoteJid || !text) {
      return res.status(400).json({ error: 'instanceName, remoteJid e text são obrigatórios' });
    }

    const url = `${EVOLUTION_URL}/message/sendText/${instanceName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: remoteJid,
        text: text,
        linkPreview: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Chat Send] Erro ao enviar texto: ${response.status}`, data);
      return res.status(response.status).json(data);
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[Chat Send] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat/send-media — Envio seguro de mídia via Evolution API
router.post('/send-media', async (req, res) => {
  try {
    const { instanceName, remoteJid, mediaUrl, mediaType, caption } = req.body;

    if (!instanceName || !remoteJid || !mediaUrl) {
      return res.status(400).json({ error: 'instanceName, remoteJid e mediaUrl são obrigatórios' });
    }

    // Evolution API v2: endpoint depende do tipo de mídia
    const endpointMap: Record<string, string> = {
      image: 'sendMedia',
      audio: 'sendWhatsAppAudio',
      video: 'sendMedia',
      document: 'sendMedia'
    };

    const endpoint = endpointMap[mediaType || 'image'] || 'sendMedia';
    const url = `${EVOLUTION_URL}/message/${endpoint}/${instanceName}`;

    const body: any = {
      number: remoteJid,
      media: mediaUrl,
      mediatype: mediaType || 'image',
    };

    if (caption) {
      body.caption = caption;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Chat Media] Erro ao enviar mídia: ${response.status}`, data);
      return res.status(response.status).json(data);
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[Chat Media] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/chat/inbox/create — Criar Caixa de Entrada do tipo API no Chatwoot de forma segura
router.post('/inbox/create', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'O nome da caixa de entrada é obrigatório' });
    }

    const chatwootUrl = process.env.CHATWOOT_URL || 'http://chatwoot-web:3000';
    const accountId = process.env.CHATWOOT_ACCOUNT_ID || '1';
    const apiToken = process.env.CHATWOOT_API_TOKEN;

    if (!apiToken) {
      return res.status(500).json({ error: 'CHATWOOT_API_TOKEN não configurada no servidor' });
    }

    const url = `${chatwootUrl}/api/v1/accounts/${accountId}/inboxes`;

    console.log(`[Chatwoot API] Criando inbox: "${name}" em ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': apiToken
      },
      body: JSON.stringify({
        name: name,
        channel: {
          type: 'api'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Chatwoot API Error] ${response.status}:`, data);
      return res.status(response.status).json(data);
    }

    // Retorna os tokens e IDs necessários para a vinculação com a Evolution API
    res.json({
      success: true,
      inbox_id: data.id,
      name: data.name,
      webhook_helper_token: data.webhook_helper_token
    });
  } catch (error: any) {
    console.error('[Chatwoot Inbox Create] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

