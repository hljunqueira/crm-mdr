import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

dotenv.config();

const N8N_API_URL = process.env.N8N_API_URL || 'https://n8n.mdrinformaticaecelulares.com.br';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

const dirPath = path.resolve('automacao');

const files = [
  { name: 'Crediario Collections', file: 'fluxo_cobranca_crediario.json' },
  { name: 'OS Status Notifications', file: 'fluxo_os_status.json' },
  { name: 'Auth 2FA WhatsApp', file: 'fluxo_auth_2fa.json' }
];

async function deployWorkflowsClean() {
  console.log(`Starting clean workflow deployment to ${N8N_API_URL}...`);

  if (!N8N_API_KEY) {
    console.error('N8N_API_KEY missing.');
    return;
  }

  // 1. Get list of all existing workflows in n8n
  const listRes = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });

  if (!listRes.ok) {
    console.error('Failed to list existing workflows:', await listRes.text());
    return;
  }

  const listData = (await listRes.json()) as any;
  const existingWorkflows: any[] = listData.data || [];
  console.log(`Found ${existingWorkflows.length} existing workflows on n8n.`);

  for (const item of files) {
    const filePath = path.join(dirPath, item.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${item.file} not found, skipping.`);
      continue;
    }

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const payload = {
      name: item.name,
      nodes: content.nodes,
      connections: content.connections,
      settings: content.settings || {}
    };

    // Find all matching workflows by name
    const matches = existingWorkflows.filter(w => w.name === item.name);

    let mainWorkflowId = '';

    if (matches.length > 0) {
      mainWorkflowId = matches[0].id;
      console.log(`\nUpdating existing workflow "${item.name}" (ID: ${mainWorkflowId})...`);
      
      const updateRes = await fetch(`${N8N_API_URL}/api/v1/workflows/${mainWorkflowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY
        },
        body: JSON.stringify(payload)
      });

      if (!updateRes.ok) {
        console.error(`Failed to update ${item.name}:`, await updateRes.text());
        continue;
      }
      console.log(`Updated "${item.name}" successfully.`);

      // Clean up extra duplicate copies if any exist
      if (matches.length > 1) {
        for (let i = 1; i < matches.length; i++) {
          console.log(`Deactivating & deleting extra duplicate workflow ID: ${matches[i].id}...`);
          await fetch(`${N8N_API_URL}/api/v1/workflows/${matches[i].id}/deactivate`, {
            method: 'POST',
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
          });
          await fetch(`${N8N_API_URL}/api/v1/workflows/${matches[i].id}`, {
            method: 'DELETE',
            headers: { 'X-N8N-API-KEY': N8N_API_KEY }
          });
        }
      }
    } else {
      console.log(`\nCreating new workflow "${item.name}"...`);
      const createRes = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY
        },
        body: JSON.stringify(payload)
      });

      if (!createRes.ok) {
        console.error(`Failed to create ${item.name}:`, await createRes.text());
        continue;
      }

      const createData = (await createRes.json()) as any;
      mainWorkflowId = createData.id;
      console.log(`Created "${item.name}" with ID: ${mainWorkflowId}`);
    }

    // Activate the main workflow
    console.log(`Activating "${item.name}" (ID: ${mainWorkflowId})...`);
    const actRes = await fetch(`${N8N_API_URL}/api/v1/workflows/${mainWorkflowId}/activate`, {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': N8N_API_KEY }
    });

    if (actRes.ok) {
      console.log(`✅ Workflow "${item.name}" is now ACTIVE!`);
    } else {
      const actErr = await actRes.text();
      console.warn(`Activation response for ${item.name}: ${actRes.status} - ${actErr}`);
    }
  }

  console.log('\n=== DEPLOY DE WORKFLOWS DO N8N CONCLUÍDO ===');
}

deployWorkflowsClean();
