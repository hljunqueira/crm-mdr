const dotenv = require('dotenv');
dotenv.config();

async function updateOriginType() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  const fetchNode = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

  const saleIds = [
    '002883ec-ced4-4008-a4dd-5c71905ebad8', // Mateus Oliveira Brito
    '5bf1014f-1d53-48b6-bbf1-a186564aa2a6'  // Lucas da Silva Sena
  ];

  for (const id of saleIds) {
    const url = `${supabaseUrl}/rest/v1/sales?id=eq.${id}`;
    const res = await fetchNode(url, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        origin_type: 'CREDIARIO_LOJA'
      })
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`Venda ${id} atualizada com sucesso para CREDIARIO_LOJA:`, data);
    } else {
      console.error(`Erro ao atualizar venda ${id}:`, await res.text());
    }
  }
}

updateOriginType();
