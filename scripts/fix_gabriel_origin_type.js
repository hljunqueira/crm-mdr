import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Corrigindo origin_type da venda do Gabriel Dos Santos Ferreira de FINANCIAMENTO_CELULAR para CREDIARIO_LOJA...');

  const saleId = '5d3a3f3d-8377-42aa-be76-b9b5d4e7da1a';

  // 1. Atualizar origin_type na tabela sales
  const { data: updatedSale, error: saleErr } = await supabase
    .from('sales')
    .update({ origin_type: 'CREDIARIO_LOJA' })
    .eq('id', saleId)
    .select()
    .single();

  if (saleErr) {
    console.error('Erro ao atualizar venda:', saleErr);
    return;
  }

  console.log('Venda atualizada:', updatedSale.id, updatedSale.origin_type);

  // 2. Atualizar origin_type nas parcelas da venda
  const { error: instErr } = await supabase
    .from('installments')
    .update({ origin_type: 'CREDIARIO_LOJA' })
    .eq('sale_id', saleId);

  if (instErr) {
    console.error('Erro ao atualizar parcelas:', instErr);
  } else {
    console.log('Parcelas atualizadas com sucesso para CREDIARIO_LOJA.');
  }
}

run();
