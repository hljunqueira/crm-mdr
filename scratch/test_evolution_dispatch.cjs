const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

async function run() {
  console.log("=== TESTANDO DISPARO DIRETO NA EVOLUTION API ===");

  const evolutionUrl = process.env.EVOLUTION_API_URL || 'https://whatsapp.mdrinformaticaecelulares.com.br';
  const evolutionApiKey = process.env.EVOLUTION_API_KEY || 'MDR_SECRET_TOKEN_2024';
  const instanceName = 'whatsapp_mdr_arroio';

  console.log(`URL: ${evolutionUrl}/message/sendText/${instanceName}`);

  try {
    const evoRes = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify({
        number: '5548999035854@s.whatsapp.net',
        text: 'Teste de mensagem automatica MDR',
        linkPreview: false
      })
    });

    console.log("Status:", evoRes.status, evoRes.statusText);
    const text = await evoRes.text();
    console.log("Response text:", text);
  } catch (err) {
    console.error("Exceção:", err);
  }
}

run().catch(console.error);
