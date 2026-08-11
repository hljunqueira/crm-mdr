const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== ATUALIZANDO REDMI A5 (IMEI 860993083018221) PARA DISPONÍVEL NO ESTOQUE ===");

  const { data, error } = await supabase
    .from('devices')
    .update({
      status: 'available',
      stock_quantity: 1
    })
    .eq('imei', '860993083018221')
    .select();

  if (error) {
    console.error("Erro ao atualizar:", error);
  } else {
    console.log("Atualizado com sucesso:", data);
  }
}

run().catch(console.error);
