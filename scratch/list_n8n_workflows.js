import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const n8nApiUrl = process.env.N8N_API_URL || 'https://n8n.mdrinformaticaecelulares.com.br';
const n8nApiKey = process.env.N8N_API_KEY;

async function run() {
  console.log('n8n URL:', n8nApiUrl);
  console.log('n8n Key exists:', !!n8nApiKey);

  try {
    const res = await fetch(`${n8nApiUrl}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': n8nApiKey
      }
    });

    if (!res.ok) {
      console.error('Failed to fetch workflows:', res.status, await res.text());
      return;
    }

    const data = await res.json();
    console.log('Active workflows:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error querying n8n:', err);
  }
}

run();
