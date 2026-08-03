import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Henrique - PC/Desktop/Projetos Dev/crm-mdr/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSafeMigration() {
  console.log('==================================================');
  console.log('   INICIANDO MIGRAÇÃO SEGURA DOS CONTRATOS LEGADOS ');
  console.log('==================================================\n');

  // 1. Buscar todas as trava de dispositivos
  const { data: locks, error: lockErr } = await supabase.from('device_locks').select('sale_id, device_id');
  if (lockErr) console.warn('Aviso ao buscar device_locks:', lockErr.message);
  const lockedSaleIds = new Set((locks || []).map(l => l.sale_id));

  // 2. Buscar todas as vendas com dados dos aparelhos
  const { data: sales, error: salesErr } = await supabase
    .from('sales')
    .select('*, devices(category, brand, model)');

  if (salesErr || !sales) {
    console.error('Erro ao buscar vendas:', salesErr?.message);
    return;
  }

  console.log(`Total de vendas encontradas no Supabase: ${sales.length}`);

  let celSaleIds = [];
  let lojaSaleIds = [];

  sales.forEach(s => {
    const isCelularCategory = s.devices?.category === 'smartphone' || s.devices?.category === 'celular';
    const hasValidImei = s.imei_manual && s.imei_manual.trim() !== '' && s.imei_manual.trim() !== '0000000' && s.imei_manual.toUpperCase() !== 'N/A';
    const isLocked = lockedSaleIds.has(s.id);
    const hasTradeIn = Boolean(s.is_trade_in || (s.trade_in_valuation && s.trade_in_valuation > 0));

    const modelLower = (s.device_model_manual || s.devices?.model || '').toLowerCase();
    const isCellKeywords = modelLower.includes('celular') || 
                           modelLower.includes('iphone') || 
                           modelLower.includes('galaxy') || 
                           modelLower.includes('xiaomi') || 
                           modelLower.includes('poco') || 
                           modelLower.includes('redmi') || 
                           modelLower.includes('samsung') || 
                           modelLower.includes('motorola') || 
                           modelLower.includes('moto') || 
                           modelLower.includes('nota ');

    const isCrediario = s.payment_type === 'crediario';

    // Regra de Ouro: Vendas de Celulares / MDM / Financiamento
    const isFinanciamentoCelular = isLocked || isCelularCategory || hasValidImei || hasTradeIn || (isCrediario && isCellKeywords);

    if (isFinanciamentoCelular) {
      celSaleIds.push(s.id);
    } else {
      lojaSaleIds.push(s.id);
    }
  });

  console.log(`Vendas classificadas como FINANCIAMENTO_CELULAR: ${celSaleIds.length}`);
  console.log(`Vendas classificadas como CREDIARIO_LOJA: ${lojaSaleIds.length}`);

  // 3. Atualizar sales em lotes com segurança
  console.log('\n--- Atualizando vendas FINANCIAMENTO_CELULAR ---');
  if (celSaleIds.length > 0) {
    const { error: upCelErr } = await supabase
      .from('sales')
      .update({ origin_type: 'FINANCIAMENTO_CELULAR' })
      .in('id', celSaleIds);

    if (upCelErr) {
      console.error('Erro ao atualizar vendas FINANCIAMENTO_CELULAR:', upCelErr.message);
    } else {
      console.log('✅ Vendas FINANCIAMENTO_CELULAR atualizadas com sucesso!');
    }
  }

  console.log('\n--- Atualizando vendas CREDIARIO_LOJA ---');
  if (lojaSaleIds.length > 0) {
    const { error: upLojaErr } = await supabase
      .from('sales')
      .update({ origin_type: 'CREDIARIO_LOJA' })
      .in('id', lojaSaleIds);

    if (upLojaErr) {
      console.error('Erro ao atualizar vendas CREDIARIO_LOJA:', upLojaErr.message);
    } else {
      console.log('✅ Vendas CREDIARIO_LOJA atualizadas com sucesso!');
    }
  }

  // 4. Sincronizar origin_type das parcelas (installments) com base na venda correspondente
  console.log('\n--- Atualizando parcelas (installments) FINANCIAMENTO_CELULAR ---');
  if (celSaleIds.length > 0) {
    const { error: upInstCelErr } = await supabase
      .from('installments')
      .update({ origin_type: 'FINANCIAMENTO_CELULAR' })
      .in('sale_id', celSaleIds);

    if (upInstCelErr) {
      console.error('Erro ao atualizar parcelas FINANCIAMENTO_CELULAR:', upInstCelErr.message);
    } else {
      console.log('✅ Parcelas FINANCIAMENTO_CELULAR atualizadas com sucesso!');
    }
  }

  console.log('\n--- Atualizando parcelas (installments) CREDIARIO_LOJA ---');
  if (lojaSaleIds.length > 0) {
    const { error: upInstLojaErr } = await supabase
      .from('installments')
      .update({ origin_type: 'CREDIARIO_LOJA' })
      .in('sale_id', lojaSaleIds);

    if (upInstLojaErr) {
      console.error('Erro ao atualizar parcelas CREDIARIO_LOJA:', upInstLojaErr.message);
    } else {
      console.log('✅ Parcelas CREDIARIO_LOJA atualizadas com sucesso!');
    }
  }

  // 5. Auditoria de Validação Final
  console.log('\n==================================================');
  console.log('   AUDITORIA FINAL DE VALIDAÇÃO DOS CONTRATOS     ');
  console.log('==================================================');

  const { data: finalCelSales } = await supabase
    .from('sales')
    .select('id, device_model_manual, imei_manual, payment_type')
    .eq('origin_type', 'FINANCIAMENTO_CELULAR');

  const { data: finalCelInsts } = await supabase
    .from('installments')
    .select('id')
    .eq('origin_type', 'FINANCIAMENTO_CELULAR');

  console.log(`\n🎉 Total Final de Vendas em Caixa Financiamento Celular: ${finalCelSales ? finalCelSales.length : 0}`);
  console.log(`🎉 Total Final de Parcelas em Caixa Financiamento Celular: ${finalCelInsts ? finalCelInsts.length : 0}`);

  if (finalCelSales && finalCelSales.length > 0) {
    console.log('\nExemplos de Vendas em Financiamento Celular:');
    finalCelSales.slice(0, 10).forEach(s => {
      console.log(` - ID: ${s.id} | Modelo: ${s.device_model_manual} | IMEI: ${s.imei_manual || 'N/A'}`);
    });
  }
}

executeSafeMigration();
