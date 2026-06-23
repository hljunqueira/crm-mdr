import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const n8nApiUrl = process.env.N8N_API_URL || 'https://n8n.mdrinformaticaecelulares.com.br';
const n8nApiKey = process.env.N8N_API_KEY;

async function run() {
  try {
    const res = await fetch(`${n8nApiUrl}/api/v1/workflows/hGzECVMwKU3WhKtq`, {
      headers: {
        'X-N8N-API-KEY': n8nApiKey
      }
    });

    if (!res.ok) {
      console.error('Failed:', res.status);
      return;
    }

    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
