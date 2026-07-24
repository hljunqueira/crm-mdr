const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envConfig.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.substring(1, val.length - 1);
    }
    envVars[key] = val;
  }
});

const ASAAS_API_KEY = envVars.ASAAS_API_KEY;
const ASAAS_API_URL = envVars.ASAAS_API_URL || 'https://api.asaas.com/v3';

async function main() {
  const paymentId = 'pay_5825v7uljnjyhtrg';
  console.log(`Excluindo/cancelando cobrança ${paymentId} no Asaas...`);

  const res = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
    method: 'DELETE',
    headers: {
      'access_token': ASAAS_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  const data = await res.json();
  console.log('Resposta do Asaas:', JSON.stringify(data, null, 2));
}

main().catch(err => console.error(err));
