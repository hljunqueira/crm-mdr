const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const EVOLUTION_API_KEY = 'MDR_SECRET_TOKEN_2024';
const instanceName = 'whatsapp_mdr_arroio';

const rootPaths = [
  `/chat/whatsappNumbers/${instanceName}`,
];

async function run() {
  for (const path of rootPaths) {
    const url = `${EVOLUTION_URL}${path}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify({
          numbers: ['5548991013293', '5548996390126']
        })
      });
      console.log(`Path: ${path} | Status: ${response.status}`);
      const text = await response.text();
      console.log('Response:', text);
    } catch (e: any) {
      console.log(`Path: ${path} | Error: ${e.message}`);
    }
  }
}

run();
