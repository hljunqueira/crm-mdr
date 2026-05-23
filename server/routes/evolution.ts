import express from 'express';

const router = express.Router();
const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const GLOBAL_API_KEY = 'MDR_SECRET_TOKEN_2024';

// Interceptar o setup do Chatwoot para configurar de forma segura no backend (com token de admin)
router.post('/chatwoot/set/:instanceName', async (req, res) => {
  const { instanceName } = req.params;
  const { nameInbox } = req.body;

  const chatwootUrl = process.env.CHATWOOT_URL || 'http://chatwoot-web:3000';
  const accountId = process.env.CHATWOOT_ACCOUNT_ID || '1';
  const apiToken = process.env.CHATWOOT_API_TOKEN;

  if (!apiToken) {
    return res.status(500).json({ error: 'CHATWOOT_API_TOKEN não configurada no servidor' });
  }

  const url = `${EVOLUTION_URL}/chatwoot/set/${encodeURIComponent(instanceName)}`;
  console.log(`[Evolution Secure Chatwoot] Configurando Chatwoot para ${instanceName} usando token de Admin`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': GLOBAL_API_KEY
      },
      body: JSON.stringify({
        enabled: true,
        url: chatwootUrl,
        accountId: accountId,
        token: apiToken,
        nameInbox: nameInbox, // Nome exato da inbox no Chatwoot
        signMsg: true,
        signDelimiter: '\n',
        reopenConversation: true,
        conversationPending: true,
        importContacts: true,
        importMessages: true,
        daysLimitImportMessages: 7
      })
    });

    const text = await response.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        data = { message: text };
      }
    }

    res.status(response.status).json(data);
  } catch (error: any) {
    console.error(`[Evolution Secure Chatwoot] Erro:`, error);
    res.status(500).json({ error: 'Secure setup failed', message: error.message });
  }
});

// Proxy para chamadas da Evolution API
router.all('/*', async (req, res) => {
  const targetPath = req.params[0] || '';
  const url = `${EVOLUTION_URL}/${encodeURI(targetPath)}`;

  console.log(`[Proxy] ${req.method} ${url}`);

  try {
    const options: any = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': GLOBAL_API_KEY
      }
    };

    if (!['GET', 'HEAD'].includes(req.method) && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, options);
    console.log(`[Proxy] Response Status: ${response.status}`);

    const text = await response.text();
    let data: any = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        data = { message: text };
      }
    }

    if (!response.ok) {
      console.error(`[Evolution Error] ${url}:`, JSON.stringify(data));
    }
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error(`[Proxy] Error for ${url}:`, error);
    res.status(500).json({ error: 'Proxy failed', message: error.message });
  }
});

export default router;
