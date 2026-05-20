

const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const EVOLUTION_API_KEY = 'MDR_SECRET_TOKEN_2024';

async function test() {
  const instanceName = 'mdr_test_instance';
  console.log('Testing webhook set endpoint on Evolution API directly...');
  try {
    const res = await fetch(`${EVOLUTION_URL}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        webhook: {
          url: `http://app:3000/api/webhooks/evolution`,
          enabled: true,
          webhookByEvents: true,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
        }
      })
    });
    console.log('Webhook Set Status:', res.status);
    const data = await res.json();
    console.log('Webhook Set Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
