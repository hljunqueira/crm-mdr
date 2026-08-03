import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

export const cashierRouter = Router();

// GET /api/cashier/summary - Retorna os saldos segregados de Caixa Financeira e Caixa Loja
cashierRouter.get('/summary', async (req, res) => {
  try {
    const { storeId } = req.query;
    const targetUnitId = (storeId && storeId !== 'all') ? String(storeId) : null;

    // 1. Buscar parcelas pagas no Supabase com relação sales!inner e filtro de unidade
    let installmentsQuery = supabase
      .from('installments')
      .select('value, origin_type, payment_method, sales!inner(origin_type, store_id, payment_type, payment_method)')
      .eq('status', 'paid');
    
    if (targetUnitId) {
      installmentsQuery = installmentsQuery.eq('sales.store_id', targetUnitId);
    }

    const { data: paidInstallments, error: instErr } = await installmentsQuery;
    if (instErr) console.warn('Aviso ao buscar parcelas pagas:', instErr.message);

    let totalFinanceiraInstallments = 0;
    let totalLojaInstallments = 0;

    (paidInstallments || []).forEach((inst: any) => {
      const val = Number(inst.value) || 0;
      const isCard = inst.payment_method === 'card' ||
                     inst.payment_method === 'debit' ||
                     inst.sales?.payment_type === 'card' ||
                     inst.sales?.payment_type === 'debit' ||
                     inst.sales?.payment_method === 'card' ||
                     inst.sales?.payment_method === 'debit';

      // Vendas no cartão pertencem ao Controle de Cartões, não ao Crediário Próprio da Loja
      if (isCard) return;

      const isFinanc = inst.origin_type === 'FINANCIAMENTO_CELULAR' ||
        inst.sales?.origin_type === 'FINANCIAMENTO_CELULAR';

      if (isFinanc) {
        totalFinanceiraInstallments += val;
      } else {
        totalLojaInstallments += val;
      }
    });

    // 2. Buscar entradas de todas as vendas concluídas (Entradas de Aparelhos + Balcão entram no Caixa Loja)
    let salesQuery = supabase
      .from('sales')
      .select('down_payment, origin_type, store_id')
      .eq('status', 'completed');
    
    if (targetUnitId) {
      salesQuery = salesQuery.eq('store_id', targetUnitId);
    }

    const { data: salesData, error: salesErr } = await salesQuery;
    if (salesErr) console.warn('Aviso ao buscar vendas:', salesErr.message);

    let totalLojaDownPayments = 0;

    (salesData || []).forEach((sale: any) => {
      const down = Number(sale.down_payment) || 0;
      totalLojaDownPayments += down;
    });

    // 3. Buscar transações de caixa diretas com filtro de unidade
    let cashTxsQuery = supabase
      .from('cash_transactions')
      .select('*');

    if (targetUnitId) {
      cashTxsQuery = cashTxsQuery.eq('unit_id', targetUnitId);
    }

    const { data: cashTxs, error: cashErr } = await cashTxsQuery;
    if (cashErr) console.warn('Aviso ao buscar transações de caixa:', cashErr.message);

    // Filtrar transações diretas sem duplicar as lançadas por vendas/parcelas ou repasses em cashier_transfers
    const extraFinanceiraIn = (cashTxs || [])
      .filter((t: any) => t.cashier_type === 'FINANCEIRA' && (t.type === 'in' || t.type === 'inflow') && !t.sale_id && !t.installment_id && !(t.description || '').includes('[REPASSE'))
      .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

    const extraFinanceiraOut = (cashTxs || [])
      .filter((t: any) => t.cashier_type === 'FINANCEIRA' && (t.type === 'out' || t.type === 'outflow') && !(t.description || '').includes('[REPASSE'))
      .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

    // 4. Buscar histórico de repasses (Financeira -> Loja) com filtro de unidade
    let transfersQuery = supabase
      .from('cashier_transfers')
      .select('*')
      .order('created_at', { ascending: false });

    if (targetUnitId) {
      transfersQuery = transfersQuery.eq('store_id', targetUnitId);
    }

    const { data: transfersData, error: transErr } = await transfersQuery;
    if (transErr && transErr.code !== '42P01') {
      console.warn('Aviso ao buscar cashier_transfers:', transErr.message);
    }

    const totalTransferred = (transfersData || []).reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

    // Saldo Bruto Arrecadado pela Financeira (Parcelas de Financiamento cobradas no Asaas)
    const totalFinanceiraArrecadado = totalFinanceiraInstallments + extraFinanceiraIn - extraFinanceiraOut;

    // Saldo Líquido Disponível no Caixa Financeira (Aguardando Repasse)
    const financeiraBalance = Math.max(0, totalFinanceiraArrecadado - totalTransferred);

    // Saldo no Caixa Loja (Entradas de Aparelhos + Vendas Balcão + Parcelas Crediário Loja + Transações Diretas Loja + Repasses Recebidos - Saídas)
    const extraLojaIn = (cashTxs || [])
      .filter((t: any) => (t.cashier_type === 'LOJA' || !t.cashier_type) && (t.type === 'in' || t.type === 'inflow') && !t.sale_id && !t.installment_id && !(t.description || '').includes('[REPASSE'))
      .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

    const extraLojaOut = (cashTxs || [])
      .filter((t: any) => (t.cashier_type === 'LOJA' || !t.cashier_type) && (t.type === 'out' || t.type === 'outflow') && !(t.description || '').includes('[REPASSE'))
      .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

    const totalLojaEntradasDiretas = totalLojaInstallments + totalLojaDownPayments + extraLojaIn;
    const lojaBalance = (totalLojaEntradasDiretas + totalTransferred) - extraLojaOut;

    return res.json({
      success: true,
      financeira: {
        totalArrecadado: totalFinanceiraArrecadado,
        totalRepassado: totalTransferred,
        balance: financeiraBalance,
        totalPaidInstallments: totalFinanceiraInstallments,
        totalDownPayments: 0
      },
      loja: {
        totalRepassesRecebidos: totalTransferred,
        totalEntradasDiretas: totalLojaEntradasDiretas,
        totalSaidas: extraLojaOut,
        balance: lojaBalance,
        totalPaidInstallments: totalLojaInstallments,
        totalDownPayments: totalLojaDownPayments
      },
      recentTransfers: (transfersData || []).slice(0, 20)
    });
  } catch (error: any) {
    console.error('Erro em GET /api/cashier/summary:', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao consultar resumo dos caixas.' });
  }
});

// POST /api/cashier/transfer - Realiza o repasse de valores da Financeira para a Loja
cashierRouter.post('/transfer', async (req, res) => {
  try {
    const { amount, description, transferredBy, storeId } = req.body;
    const transferAmount = Number(amount);

    if (!transferAmount || isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ error: 'Informe um valor de repasse válido maior que zero.' });
    }

    const transferId = 'trans_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newTransfer = {
      id: transferId,
      store_id: storeId || null,
      from_cashier: 'FINANCEIRA',
      to_cashier: 'LOJA',
      amount: transferAmount,
      description: description || 'Repasse consolidado de recebimentos para o Caixa Loja',
      transferred_by: transferredBy || null,
      created_at: new Date().toISOString()
    };

    // 1. Salvar em cashier_transfers no Supabase
    const { data: createdTransfer, error: insertErr } = await supabase
      .from('cashier_transfers')
      .insert([newTransfer])
      .select()
      .single();

    if (insertErr) {
      console.warn('Erro ao inserir em cashier_transfers no Supabase:', insertErr.message);
    }

    // 2. Registrar saída no Caixa Financeira e entrada no Caixa Loja
    const txFinanceiraOut = {
      id: 'ctx_fin_' + Date.now(),
      unit_id: storeId || null,
      type: 'out',
      amount: transferAmount,
      description: `[REPASSE] ${description || 'Repasse para Caixa Loja'}`,
      cashier_type: 'FINANCEIRA',
      created_at: new Date().toISOString()
    };

    const txLojaIn = {
      id: 'ctx_loj_' + Date.now(),
      unit_id: storeId || null,
      type: 'in',
      amount: transferAmount,
      description: `[REPASSE RECEBIDO] ${description || 'Recebimento de Repasse da Financeira'}`,
      cashier_type: 'LOJA',
      created_at: new Date().toISOString()
    };

    await supabase.from('cash_transactions').insert([txFinanceiraOut, txLojaIn]);

    return res.json({
      success: true,
      message: `Repasse de R$ ${transferAmount.toFixed(2)} realizado com sucesso!`,
      transfer: createdTransfer || newTransfer
    });
  } catch (error: any) {
    console.error('Erro em POST /api/cashier/transfer:', error);
    return res.status(500).json({ error: error.message || 'Erro ao processar repasse entre caixas.' });
  }
});

// GET /api/cashier/transfers - Retorna o histórico de repasses efetuados
cashierRouter.get('/transfers', async (req, res) => {
  try {
    const { storeId } = req.query;
    let query = supabase
      .from('cashier_transfers')
      .select('*')
      .order('created_at', { ascending: false });

    if (storeId && storeId !== 'all') {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error && error.code !== '42P01') {
      console.warn('Aviso ao consultar cashier_transfers:', error.message);
    }

    return res.json(data || []);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
