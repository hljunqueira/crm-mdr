import fetch from 'node-fetch';

async function testConnect() {
  const evolutionUrl = 'https://whatsapp.mdrinformaticaecelulares.com.br';
  const apiKey = 'MDR_SECRET_TOKEN_2024';

  console.log('Requesting connect / QR Code for whatsapp_mdr_arroio...');
  try {
    const res = await fetch(`${evolutionUrl}/instance/connect/whatsapp_mdr_arroio`, {
      headers: { 'apikey': apiKey }
    });
    console.log(`connect status: ${res.status}`);
    const data = await res.json();
    console.log('Connect Response:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Error connecting:', err.message);
  }
}

testConnect();
