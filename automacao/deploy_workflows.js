import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const n8nUrl = process.env.N8N_API_URL;
const n8nKey = process.env.N8N_API_KEY;

if (!n8nUrl || !n8nKey) {
  console.error('N8N_API_URL or N8N_API_KEY missing from environment.');
  process.exit(1);
}

const dirPath = path.resolve('automacao');

const files = [
  { name: 'OS Status Notifications', file: 'fluxo_os_status.json' },
  { name: 'Crediario Collections', file: 'fluxo_cobranca_crediario.json' },
  { name: 'Auth 2FA WhatsApp', file: 'fluxo_auth_2fa.json' }
];

async function deployWorkflows() {
  console.log(`Starting workflow deployments to ${n8nUrl}...`);

  for (const item of files) {
    const filePath = path.join(dirPath, item.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${item.file} not found, skipping.`);
      continue;
    }

    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      const payload = {
        name: item.name,
        nodes: content.nodes,
        connections: content.connections,
        settings: content.settings || {}
      };

      console.log(`Deploying: ${item.name}...`);
      const response = await fetch(`${n8nUrl}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': n8nKey
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Success! Workflow "${item.name}" deployed with ID: ${result.id}`);
        
        console.log(`Activating: ${item.name}...`);
        const actResponse = await fetch(`${n8nUrl}/api/v1/workflows/${result.id}/activate`, {
          method: 'POST',
          headers: {
            'X-N8N-API-KEY': n8nKey
          }
        });
        
        if (actResponse.ok) {
          console.log(`Workflow "${item.name}" is now ACTIVE.`);
        } else {
          const actErr = await actResponse.text();
          console.error(`Failed to activate ${item.name}: ${actResponse.statusText} - ${actErr}`);
        }
      } else {
        const err = await response.text();
        console.error(`Failed to deploy ${item.name}: ${response.statusText} - ${err}`);
      }
    } catch (e) {
      console.error(`Error processing ${item.name}:`, e.message);
    }
  }
}

deployWorkflows().catch(console.error);
