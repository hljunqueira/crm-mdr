const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

async function testDispatch(rawPhone, text) {
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const targetPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  const evolutionUrl = process.env.EVOLUTION_API_URL || 'https://whatsapp.mdrinformaticaecelulares.com.br';
  const evolutionApiKey = process.env.EVOLUTION_API_KEY || 'MDR_SECRET_TOKEN_2024';
  const instanceName = 'whatsapp_mdr_arroio';

  console.log(`Sending to ${targetPhone} via Evolution API (${instanceName})...`);

  const evoRes = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': evolutionApiKey
    },
    body: JSON.stringify({
      number: targetPhone,
      text: text,
      linkPreview: false
    })
  });

  console.log("Status:", evoRes.status);
  const resText = await evoRes.text();
  console.log("Response:", resText);
}

testDispatch('48999035854', 'Teste de cobranca automatica MDR').catch(console.error);
