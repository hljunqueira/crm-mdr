import dotenv from 'dotenv';
dotenv.config();

const asaasApiKey = (process.env.ASAAS_API_KEY || '').replace(/'/g, '');
const asaasUrl = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

async function run() {
  console.log('ASAAS URL:', asaasUrl);
  
  // 1. Get webhook configuration
  console.log('\n--- Webhook Settings ---');
  try {
    const res = await fetch(`${asaasUrl}/webhook`, {
      headers: { 'access_token': asaasApiKey }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error(`Failed to get webhook settings: ${res.status}`, await res.text());
    }
  } catch (err: any) {
    console.error('Error fetching webhook settings:', err.message);
  }

  // 2. Get payment details of pay_tn6zcozycoe247hp
  console.log('\n--- Payment Details for pay_tn6zcozycoe247hp ---');
  try {
    const res = await fetch(`${asaasUrl}/payments/pay_tn6zcozycoe247hp`, {
      headers: { 'access_token': asaasApiKey }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error(`Failed to get payment details: ${res.status}`, await res.text());
    }
  } catch (err: any) {
    console.error('Error fetching payment details:', err.message);
  }
}

run();
