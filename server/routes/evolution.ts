import express from 'express';

const router = express.Router();
const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const GLOBAL_API_KEY = 'MDR_SECRET_TOKEN_2024';

// Proxy para chamadas da Evolution API
router.all('/*', async (req, res) => {
  const targetPath = req.params[0] || '';
  const url = `${EVOLUTION_URL}/${targetPath}`;
  
  console.log(`[Proxy] ${req.method} ${url}`);
  
  try {
    const options: any = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': GLOBAL_API_KEY,
        'apiKey': GLOBAL_API_KEY,
        'Authorization': `Bearer ${GLOBAL_API_KEY}`
      }
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      options.body = JSON.stringify(req.body);
      console.log(`[Proxy] Body:`, options.body);
    }

    const response = await fetch(url, options);
    console.log(`[Proxy] Response Status: ${response.status}`);
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`[Proxy] Error for ${url}:`, error);
    res.status(500).json({ error: 'Proxy failed', message: error.message });
  }
});

export default router;
