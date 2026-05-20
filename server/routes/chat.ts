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

export default router;
