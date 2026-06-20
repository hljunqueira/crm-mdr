const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

async function main() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: './docs/crm-mdr-7bd29f5d4741.json',
      scopes: ['https://www.googleapis.com/auth/androidmanagement'],
    });
    const amapi = google.androidmanagement({ version: 'v1', auth });

    const enterpriseToken = 'EABBn3pMAtZXK5OCdhHVo0LWNPET1tTfu38DgSDRV7DfUL0XVaW-DigfqUQcOq-TYmE62G0HRw9S4KHDaYLj-4s2USDbz-27U4P1xAiHna3TTWElVGy8idbo';
    const signupUrlName = 'signupUrls/B9B344F50272EF321';

    console.log('--- 2. REALIZANDO O VÍNCULO ---');
    const enterprise = await amapi.enterprises.create({
      enterpriseToken: enterpriseToken,
      signupUrlName: signupUrlName,
      projectId: 'crm-mdr',
      requestBody: {}
    });

    const enterpriseId = enterprise.data.name;
    console.log('Enterprise ID obtido com sucesso:', enterpriseId);

    // Save to Supabase using REST API directly to avoid package issues
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase URL ou Key não encontradas no .env');
      return;
    }

    console.log('Salvando no Supabase...');
    const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
    
    // Check if it already exists or insert/upsert
    const response = await fetch(`${supabaseUrl}/rest/v1/automation_settings`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: 'google_enterprise_id',
        value: enterpriseId,
        updated_at: new Date().toISOString()
      })
    });

    if (response.ok) {
      console.log('Enterprise ID salvo com sucesso no banco de dados!');
    } else {
      const errText = await response.text();
      console.error('Erro ao salvar no Supabase:', errText);
    }

  } catch (error) {
    console.error('Erro ao concluir registro:', error.message || error);
  }
}
main();
