

const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const EVOLUTION_API_KEY = 'MDR_SECRET_TOKEN_2024';

async function test() {
  const instanceName = 'mdr_test_instance';
  console.log('Testing instance creation on Evolution API directly...');
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        instanceName: instanceName,
        token: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    });
    console.log('Create Instance Status:', res.status);
    const data = await res.json();
    console.log('Create Instance Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
