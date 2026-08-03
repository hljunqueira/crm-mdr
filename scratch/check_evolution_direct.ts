import fetch from 'node-fetch';

async function checkEvolution() {
  const evolutionUrl = 'https://whatsapp.mdrinformaticaecelulares.com.br';
  const apiKey = 'MDR_SECRET_TOKEN_2024';

  console.log('--- 1. Fetching Evolution Instances ---');
  try {
    const res = await fetch(`${evolutionUrl}/instance/fetchInstances`, {
      headers: { 'apikey': apiKey }
    });
    console.log(`fetchInstances status: ${res.status}`);
    const data = await res.json();
    console.log('Instances:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Error fetching instances:', err.message);
  }

  console.log('\n--- 2. Checking connection state for whatsapp_mdr_arroio ---');
  try {
    const res = await fetch(`${evolutionUrl}/instance/connectionState/whatsapp_mdr_arroio`, {
      headers: { 'apikey': apiKey }
    });
    console.log(`connectionState status: ${res.status}`);
    const data = await res.json();
    console.log('State:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Error checking state:', err.message);
  }

  console.log('\n--- 3. Testing Direct WhatsApp Message to Henrique (5548991013293) ---');
  try {
    const payload = {
      number: "5548991013293@s.whatsapp.net",
      text: "🤖 *Teste de Diagnóstico MDR* 🤖\n\nOlá Henrique, esta é uma mensagem de teste enviada diretamente da Evolution API para verificar a entrega do WhatsApp."
    };
    const res = await fetch(`${evolutionUrl}/message/sendText/whatsapp_mdr_arroio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify(payload)
    });
    console.log(`sendText status: ${res.status}`);
    const text = await res.text();
    console.log('sendText response:', text);
  } catch (err: any) {
    console.error('Error sending direct text:', err.message);
  }
}

checkEvolution();
