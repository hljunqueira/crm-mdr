import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const n8nUrl = process.env.N8N_API_URL || 'https://n8n.mdrinformaticaecelulares.com.br';
const n8nKey = process.env.N8N_API_KEY;

if (!n8nUrl || !n8nKey) {
  console.error('N8N_API_URL or N8N_API_KEY missing from environment.');
  process.exit(1);
}

const dirPath = path.resolve('automacao');

const files = [
  { name: 'Crediario Collections', file: 'fluxo_cobranca_crediario.json' },
  { name: 'OS Status Notifications', file: 'fluxo_os_status.json' },
  { name: 'Auth 2FA WhatsApp', file: 'fluxo_auth_2fa.json' }
];

async function deployWorkflows() {
  console.log(`Starting clean workflow deployments to ${n8nUrl}...`);

  // 1. Fetch existing non-archived workflows
  const listRes = await fetch(`${n8nUrl}/api/v1/workflows`, {
    headers: { 'X-N8N-API-KEY': n8nKey }
  });

  if (!listRes.ok) {
    console.error('Failed to list existing workflows:', await listRes.text());
    process.exit(1);
  }

  const listData = await listRes.json();
  const existingWorkflows = (listData.data || []).filter(w => !w.archived);

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

      const matches = existingWorkflows.filter(w => w.name === item.name);
      let mainWorkflowId = '';

      if (matches.length > 0) {
        mainWorkflowId = matches[0].id;
        console.log(`Updating existing workflow "${item.name}" (ID: ${mainWorkflowId})...`);

        const updateRes = await fetch(`${n8nUrl}/api/v1/workflows/${mainWorkflowId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': n8nKey
          },
          body: JSON.stringify(payload)
        });

        if (!updateRes.ok) {
          console.error(`Failed to update ${item.name}:`, await updateRes.text());
          continue;
        }

        // Cleanup duplicates
        if (matches.length > 1) {
          for (let i = 1; i < matches.length; i++) {
            console.log(`Cleaning duplicate workflow ID: ${matches[i].id}...`);
            await fetch(`${n8nUrl}/api/v1/workflows/${matches[i].id}/deactivate`, {
              method: 'POST',
              headers: { 'X-N8N-API-KEY': n8nKey }
            });
            await fetch(`${n8nUrl}/api/v1/workflows/${matches[i].id}`, {
              method: 'DELETE',
              headers: { 'X-N8N-API-KEY': n8nKey }
            });
          }
        }
      } else {
        console.log(`Creating new workflow "${item.name}"...`);
        const createRes = await fetch(`${n8nUrl}/api/v1/workflows`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': n8nKey
          },
          body: JSON.stringify(payload)
        });

        if (!createRes.ok) {
          console.error(`Failed to create ${item.name}:`, await createRes.text());
          continue;
        }

        const createData = await createRes.json();
        mainWorkflowId = createData.id;
      }

      // Activate main workflow
      console.log(`Activating "${item.name}" (ID: ${mainWorkflowId})...`);
      const actResponse = await fetch(`${n8nUrl}/api/v1/workflows/${mainWorkflowId}/activate`, {
        method: 'POST',
        headers: { 'X-N8N-API-KEY': n8nKey }
      });

      if (actResponse.ok) {
        console.log(`✅ Workflow "${item.name}" is now ACTIVE.`);
      } else {
        const actErr = await actResponse.text();
        console.warn(`Activation result for ${item.name}: ${actResponse.statusText} - ${actErr}`);
      }
    } catch (e) {
      console.error(`Error processing ${item.name}:`, e.message);
    }
  }

  console.log('=== WORKFLOW DEPLOY COMPLETED SUCCESSFULLY ===');
}

deployWorkflows().catch(console.error);
