import express from 'express';

const router = express.Router();
const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const GLOBAL_API_KEY = 'MDR_SECRET_TOKEN_2024';

// Proxy para chamadas da Evolution API
router.all('/*', async (req, res) => {
  const targetPath = req.params[0] || '';
  const url = `${EVOLUTION_URL}/${targetPath}`;
  
  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': GLOBAL_API_KEY
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`Proxy error for ${url}:`, error);
    res.status(500).json({ error: 'Proxy failed', message: error.message });
  }
});

export default router;
