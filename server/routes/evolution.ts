import express from 'express';

const router = express.Router();
const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const GLOBAL_API_KEY = 'MDR_SECRET_TOKEN_2024';

// Proxy para chamadas da Evolution API
router.all('/*', async (req, res) => {
  const targetPath = req.params[0];
  const targetUrl = `http://evolution:8080/${targetPath}`;
  
  console.log(`[Proxy] ${req.method} ${targetUrl}`);

  try {
    const queryParams = new URLSearchParams(req.query as any).toString();
    const finalUrl = queryParams ? `${targetUrl}?${queryParams}` : targetUrl;

    const response = await fetch(finalUrl, {
      method: req.method,
      headers: {
        ...req.headers as any,
        'Content-Type': 'application/json',
        'apikey': 'MDR_SECRET_TOKEN_2024'
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
    });

    console.log(`[Proxy] Response: ${response.status}`);
    const data = await response.json();
    if (!response.ok) {
      console.error(`Evolution API Error (${targetUrl}):`, JSON.stringify(data));
    }
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`Evolution Proxy Error (${targetUrl}):`, error);
    res.status(500).json({ error: 'Erro na comunicação com Evolution API' });
  }
});

export default router;
