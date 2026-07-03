import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

dotenv.config();

const N8N_API_URL = process.env.N8N_API_URL || 'https://n8n.mdrinformaticaecelulares.com.br';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

async function run() {
  console.log('N8N API URL:', N8N_API_URL);
  
  if (!N8N_API_KEY) {
    console.error('N8N_API_KEY not found in environment.');
    return;
  }

  // Load the flow JSON file
  const flowPath = path.resolve('automacao/fluxo_scp_notificacoes.json');
  const flowContent = JSON.parse(fs.readFileSync(flowPath, 'utf8'));

  // Prepare payload for creating workflow in N8N v1 API
  const payload = {
    name: 'MDR - SCP Notificações WhatsApp',
    nodes: flowContent.nodes,
    connections: flowContent.connections,
    settings: flowContent.settings || {}
  };

  try {
    // 1. Check if a workflow with the same name already exists to avoid duplicates
    console.log('Fetching existing workflows...');
    const listRes = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      throw new Error(`Failed to list workflows: ${listRes.status} ${listRes.statusText} - ${errText}`);
    }

    const listData = await listRes.json() as any;
    const existingWorkflow = listData.data?.find((w: any) => w.name === payload.name);

    let workflowId = '';
    if (existingWorkflow) {
      console.log(`Workflow already exists with ID: ${existingWorkflow.id}. Updating it...`);
      workflowId = existingWorkflow.id;
      
      const updateRes = await fetch(`${N8N_API_URL}/api/v1/workflows/${workflowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY
        },
        body: JSON.stringify(payload)
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        throw new Error(`Failed to update workflow: ${updateRes.status} ${updateRes.statusText} - ${errText}`);
      }

      console.log('Workflow successfully updated!');
    } else {
      console.log('Creating new workflow...');
      const createRes = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY
        },
        body: JSON.stringify(payload)
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to create workflow: ${createRes.status} ${createRes.statusText} - ${errText}`);
      }

      const createData = await createRes.json() as any;
      workflowId = createData.id;
      console.log(`Workflow successfully created with ID: ${workflowId}`);
    }

    // 2. Ensure it is activated (just in case)
    console.log('Activating workflow...');
    const activateRes = await fetch(`${N8N_API_URL}/api/v1/workflows/${workflowId}/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY
      }
    });
    
    if (activateRes.ok) {
      console.log('Workflow successfully activated!');
    } else {
      // fallback to put active = true
      const updateRes = await fetch(`${N8N_API_URL}/api/v1/workflows/${workflowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': N8N_API_KEY
        },
        body: JSON.stringify({ active: true })
      });
      if (updateRes.ok) {
        console.log('Workflow successfully activated via update PUT.');
      } else {
        console.warn('Could not activate workflow. You might need to manually activate it.');
      }
    }

  } catch (err: any) {
    console.error('Error during N8N deployment:', err.message);
  }
}

run();
