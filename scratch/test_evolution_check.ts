import dotenv from 'dotenv';
dotenv.config();

const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const EVOLUTION_API_KEY = 'MDR_SECRET_TOKEN_2024';
const instanceName = 'whatsapp_mdr_arroio';

async function test() {
  const numbersToCheck = [
    '5548991013293', // User's number
    '5548996390126', // Andileine's number
  ];

  const url = `${EVOLUTION_URL}/contacts/checkNumber/${instanceName}`;
  console.log('Calling Evolution API at:', url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        numbers: numbersToCheck
      })
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error calling Evolution API:', error);
  }
}

test();
