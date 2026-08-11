const dotenv = require('dotenv');
dotenv.config();

async function checkSalesForCustomers() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  const fetchNode = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

  async function queryTable(table, select, filterStr = '') {
    const url = `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}${filterStr}`;
    const res = await fetchNode(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    if (!res.ok) {
      throw new Error(`Error fetching ${table}: ${await res.text()}`);
    }
    return await res.json();
  }

  try {
    console.log('--- BUSCANDO VENDAS DE LUCAS DA SILVA SENA E MATEUS OLIVEIRA BRITO ---');

    const sales = await queryTable('sales', '*');
    
    const customers = await queryTable('customers', 'id,name');
    console.log(`Total de clientes: ${customers.length}`);
    const lucasCust = customers.filter(c => (c.name || '').toLowerCase().includes('lucas'));
    const mateusCust = customers.filter(c => (c.name || '').toLowerCase().includes('mateus'));

    console.log('\nClientes Lucas:');
    console.dir(lucasCust);

    console.log('\nClientes Mateus:');
    console.dir(mateusCust);

    const targetCustIds = [...lucasCust.map(c => c.id), ...mateusCust.map(c => c.id)];
    const userSales = sales.filter(s => targetCustIds.includes(s.customer_id));

    console.log('\n--- DETALHES COMPLETOS DA VENDA DO MATEUS ---');
    console.dir(userSales.find(s => s.customer_id === 'cc143cbe-4a56-4b8d-a2fb-a9ec32eae116'), { depth: null });

    console.log('\n--- DETALHES COMPLETOS DA VENDA DO LUCAS ---');
    console.dir(userSales.find(s => s.customer_id === '9206c5f1-6b7e-420e-874c-9396351769bd'), { depth: null });

  } catch (err) {
    console.error(err);
  }
}

checkSalesForCustomers();
