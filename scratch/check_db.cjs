const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL ou Key não encontradas no .env');
    return;
  }

  const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
  
  const response = await fetch(`${supabaseUrl}/rest/v1/automation_settings?key=eq.google_enterprise_id`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  if (response.ok) {
    const data = await response.json();
    console.log('Dados do banco de dados (google_enterprise_id):', data);
  } else {
    console.error('Erro ao buscar do banco:', await response.text());
  }
}
main();
