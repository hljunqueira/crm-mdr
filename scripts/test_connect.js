

const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const EVOLUTION_API_KEY = 'MDR_SECRET_TOKEN_2024';

async function test() {
  const instanceName = 'mdr_test_instance';
  console.log('Testing instance connect endpoint on Evolution API directly...');
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });
    console.log('Connect Status:', res.status);
    const data = await res.json();
    console.log('Connect Response keys:', Object.keys(data));
    console.log('Connect Response (truncated):', JSON.stringify(data).substring(0, 500));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
