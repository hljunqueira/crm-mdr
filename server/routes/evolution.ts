import express from 'express';

const router = express.Router();
const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const GLOBAL_API_KEY = 'MDR_SECRET_TOKEN_2024';

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
