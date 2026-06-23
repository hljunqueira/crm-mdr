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
    const res = await fetch(`${n8nApiUrl}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': n8nApiKey
      }
    });

    if (!res.ok) {
      console.error('Failed to fetch workflows:', res.status);
      return;
    }

    const data = await res.json();
    console.log(`Found ${data.data.length} workflows:`);
    for (const w of data.data) {
      const webhooks = w.nodes.filter(n => n.type === 'n8n-nodes-base.webhook');
      const paths = webhooks.map(n => n.parameters?.path).join(', ');
      console.log(`- Name: "${w.name}" | ID: ${w.id} | Active: ${w.active} | Paths: [${paths}]`);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
