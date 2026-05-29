const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const GLOBAL_API_KEY = 'MDR_SECRET_TOKEN_2024';

async function check() {
  try {
    console.log('Querying Evolution API instances...');
    const response = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': GLOBAL_API_KEY
      }
    });

    console.log('Status code:', response.status);
    const data = await response.json();
    console.log('Data returned:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error querying Evolution:', error);
  }
}

check();
