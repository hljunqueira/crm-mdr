import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function fixJuniorSale() {
  console.log('Buscando venda de JUNIOR (X-DUGORDINHO)...');

  // Buscar vendas que contêm "DUGORDINHO" no modelo
  const { data: sales, error: salesErr } = await supabase
    .from('sales')
    .select('*, customers(name)')
    .ilike('device_model_manual', '%DUGORDINHO%');

  if (salesErr) {
    console.error('Erro ao buscar vendas:', salesErr);
    return;
  }

  console.log(`Vendas encontradas: ${sales?.length || 0}`);
  let allSales = sales || [];

  if (allSales.length === 0) {
    // Tentar por cliente
    const { data: custs } = await supabase.from('customers').select('id, name').ilike('name', '%JUNIOR%');
    console.log('Clientes Junior encontrados:', custs);
    if (custs && custs.length > 0) {
      const custIds = custs.map(c => c.id);
      const { data: custSales } = await supabase.from('sales').select('*').in('customer_id', custIds);
      console.log('Vendas dos clientes Junior:', custSales);
      allSales = custSales || [];
    }
  }

  for (const sale of allSales) {
    console.log(`\nAtualizando venda ID: ${sale.id} | Modelo: ${sale.device_model_manual} | Origin atual: ${sale.origin_type}`);

    // Update sale origin_type
    const { error: upSaleErr } = await supabase
      .from('sales')
      .update({ origin_type: 'CREDIARIO_LOJA' })
      .eq('id', sale.id);

    if (upSaleErr) {
      console.error('Erro ao atualizar venda:', upSaleErr);
    } else {
      console.log(`✅ Venda ${sale.id} alterada com sucesso para CREDIARIO_LOJA`);
    }

    // Update installments origin_type
    const { data: updatedInsts, error: upInstErr } = await supabase
      .from('installments')
      .update({ origin_type: 'CREDIARIO_LOJA' })
      .eq('sale_id', sale.id)
      .select();

    if (upInstErr) {
      console.error('Erro ao atualizar parcelas:', upInstErr);
    } else {
      console.log(`✅ ${updatedInsts?.length || 0} parcelas atualizadas para CREDIARIO_LOJA`);
    }
  }
}

fixJuniorSale();
