const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const GLOBAL_API_KEY = 'MDR_SECRET_TOKEN_2024';
const INSTANCE_NAME = 'e2014af3-ca2f-466b-b2c3-56e6c6113990';

async function check() {
  try {
    console.log(`Checking connection state for instance: ${INSTANCE_NAME}...`);
    const response = await fetch(`${EVOLUTION_URL}/instance/connectionState/${INSTANCE_NAME}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': GLOBAL_API_KEY
      }
    });

    console.log('Status code:', response.status);
    const data = await response.json();
    console.log('Response JSON:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error querying connection state:', error);
  }
}

check();
