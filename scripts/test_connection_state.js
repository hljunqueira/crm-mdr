

const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const EVOLUTION_API_KEY = 'MDR_SECRET_TOKEN_2024';

async function test() {
  const instanceName = 'mdr_test_instance';
  console.log('Testing connectionState endpoint on Evolution API directly...');
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });
    console.log('connectionState Status:', res.status);
    const data = await res.json();
    console.log('connectionState Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
