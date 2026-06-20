import dotenv from 'dotenv';
dotenv.config();

const asaasApiKey = (process.env.ASAAS_API_KEY || '').replace(/'/g, '');
const asaasUrl = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';

async function run() {
  const paths = [
    '/webhook',
    '/webhook/settings',
    '/webhook/charge',
    '/webhooks',
  ];

  for (const p of paths) {
    try {
      const res = await fetch(`${asaasUrl}${p}`, {
        headers: { 'access_token': asaasApiKey }
      });
      console.log(`Path ${p}: status = ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      console.error(`Error for ${p}:`, err.message);
    }
  }
}

run();
