import dotenv from 'dotenv';
dotenv.config();

const asaasApiKey = (process.env.ASAAS_API_KEY || '').replace(/'/g, '');
const asaasUrl = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
const webhookId = 'a090e8db-b644-4fb1-884c-2e4599918283';

async function run() {
  console.log('Reactivating webhook on Asaas...');
  
  // Try PUT first
  try {
    const res = await fetch(`${asaasUrl}/webhooks/${webhookId}`, {
      method: 'PUT',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://mdrinformaticaecelulares.com.br/api/webhooks/asaas',
        enabled: true,
        interrupted: false,
        events: [
          'PAYMENT_OVERDUE',
          'PAYMENT_CONFIRMED',
          'PAYMENT_RECEIVED'
        ]
      })
    });
    
    console.log(`PUT status: ${res.status}`);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Error during PUT:', err.message);
  }

  // Check new status
  try {
    const res = await fetch(`${asaasUrl}/webhooks`, {
      headers: { 'access_token': asaasApiKey }
    });
    if (res.ok) {
      console.log('New Webhook configuration:');
      console.log(JSON.stringify(await res.json(), null, 2));
    }
  } catch (err: any) {
    console.error('Error getting status:', err.message);
  }
}

run();
