import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const n8nUrl = process.env.N8N_API_URL || 'https://n8n.mdrinformaticaecelulares.com.br';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('Fetching connected instance...');
  const { data: channels, error } = await supabase
    .from('automation_channels')
    .select('*')
    .eq('status', 'connected')
    .limit(1);

  if (error || !channels || channels.length === 0) {
    console.error('No connected WhatsApp channel found. Cannot test.');
    process.exit(1);
  }

  const instanceName = channels[0].instance_name;
  console.log(`Using instance: ${instanceName}`);

  const phone = '5548991013293';
  const remoteJid = `${phone}@s.whatsapp.net`;

  // 1. Test OS Status Webhook
  const osPayload = {
    instanceName,
    remoteJid,
    text: '🛠️ *MDR Informática & Celulares - Teste de OS* 🛠️\n\nEste é um teste do fluxo de Ordem de Serviço enviado para o seu número.'
  };

  console.log('Sending OS Status test payload...');
  try {
    const res = await fetch(`${n8nUrl}/webhook/os-status-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(osPayload)
    });
    console.log(`OS Status result: ${res.status} - ${res.statusText}`);
  } catch (e) {
    console.error('OS Status request failed:', e.message);
  }

  // 2. Test Crediario Collections Webhook
  const cobrancaPayload = {
    instanceName,
    remoteJid,
    text: '⚠️ *MDR Informática & Celulares - Teste de Cobrança* ⚠️\n\nEste é um teste do fluxo de lembrete de parcelas enviado para o seu número.',
    customerName: 'Arthur Teste',
    installmentNumber: '1/12',
    dueDate: '15/06/2026',
    value: 'R$ 150,00'
  };

  console.log('Sending Crediario Collection test payload...');
  try {
    const res = await fetch(`${n8nUrl}/webhook/cobranca-crediario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cobrancaPayload)
    });
    console.log(`Collection result: ${res.status} - ${res.statusText}`);
  } catch (e) {
    console.error('Collection request failed:', e.message);
  }
}

runTest().catch(console.error);
