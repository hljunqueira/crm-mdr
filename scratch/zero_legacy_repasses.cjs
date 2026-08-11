const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== ZERANDO LISTA ANTIGA DE REPASSES PENDENTES DA FINANCEIRA ===");

  const { data: sales } = await supabase
    .from('sales')
    .select('id, origin_type, installments_count');

  const pendingSalesIds = (sales || [])
    .filter(s => s.origin_type === 'FINANCIAMENTO_CELULAR' || (Number(s.installments_count) > 1 && s.origin_type !== 'CREDIARIO_LOJA'))
    .map(s => s.id);

  console.log(`Encontradas ${pendingSalesIds.length} vendas legadas para zerar.`);

  const transferId = 'trans_legacy_clear_' + Date.now();
  const nowIso = new Date().toISOString();

  const legacyTransfer = {
    id: transferId,
    store_id: null,
    destination_store_id: null,
    origin_account: 'Ajuste Inicial de Repasses Legados',
    from_cashier: 'FINANCEIRA',
    to_cashier: 'LOJA',
    amount: 0,
    description: 'Zeramento de histórico legado de repasses da financeira',
    included_installments: JSON.stringify(pendingSalesIds),
    transferred_by: 'Administrador (Sistema)',
    created_at: nowIso
  };

  const { data, error } = await supabase
    .from('cashier_transfers')
    .insert([legacyTransfer])
    .select();

  if (error) {
    console.error("Erro ao registrar zeramento legado:", error);
  } else {
    console.log("Zeramento registrado com sucesso em cashier_transfers!", data);
  }
}

run().catch(console.error);
