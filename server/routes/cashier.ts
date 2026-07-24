import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

export const cashierRouter = Router();

// GET /api/cashier/summary - Retorna os saldos segregados de Caixa Financeira e Caixa Loja
cashierRouter.get('/summary', async (req, res) => {
  try {
    const { storeId } = req.query;

    // 1. Buscar todas as parcelas pagas no Supabase (Entradas no Caixa Financeira)
    let installmentsQuery = supabase
      .from('installments')
      .select('value')
      .eq('status', 'paid');
    
    const { data: paidInstallments, error: instErr } = await installmentsQuery;
    if (instErr) console.warn('Aviso ao buscar parcelas pagas:', instErr.message);

    const totalPaidInstallments = (paidInstallments || []).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

    // 2. Buscar entradas de crediário/entradas de vendas
    let salesQuery = supabase
      .from('sales')
      .select('down_payment')
      .eq('status', 'completed');
    
    const { data: salesData, error: salesErr } = await salesQuery;
    if (salesErr) console.warn('Aviso ao buscar vendas:', salesErr.message);

    const totalDownPayments = (salesData || []).reduce((acc, curr) => acc + (Number(curr.down_payment) || 0), 0);

    // 3. Buscar transações diretas de caixa por cashier_type
    const { data: cashTxs, error: cashErr } = await supabase
      .from('cash_transactions')
      .select('*');
    if (cashErr) console.warn('Aviso ao buscar transações de caixa:', cashErr.message);

    const extraFinanceiraIn = (cashTxs || [])
      .filter((t: any) => t.cashier_type === 'FINANCEIRA' && t.type === 'in')
      .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

    const extraFinanceiraOut = (cashTxs || [])
      .filter((t: any) => t.cashier_type === 'FINANCEIRA' && t.type === 'out')
      .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

    // 4. Buscar histórico de repasses (Financeira -> Loja)
    const { data: transfersData, error: transErr } = await supabase
      .from('cashier_transfers')
      .select('*')
      .order('created_at', { ascending: false });

    if (transErr && transErr.code !== '42P01') {
      console.warn('Aviso ao buscar cashier_transfers:', transErr.message);
    }

    const totalTransferred = (transfersData || []).reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

    // Saldo Bruto Arrecadado pela Financeira
    const totalFinanceiraArrecadado = totalPaidInstallments + totalDownPayments + extraFinanceiraIn - extraFinanceiraOut;

    // Saldo Líquido Disponível no Caixa Financeira (Aguardando Repasse)
    const financeiraBalance = Math.max(0, totalFinanceiraArrecadado - totalTransferred);

    // Saldo no Caixa Loja
    const extraLojaIn = (cashTxs || [])
      .filter((t: any) => (t.cashier_type === 'LOJA' || !t.cashier_type) && t.type === 'in')
      .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

    const extraLojaOut = (cashTxs || [])
      .filter((t: any) => (t.cashier_type === 'LOJA' || !t.cashier_type) && t.type === 'out')
      .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

    const lojaBalance = (extraLojaIn + totalTransferred) - extraLojaOut;

    return res.json({
      success: true,
      financeira: {
        totalArrecadado: totalFinanceiraArrecadado,
        totalRepassado: totalTransferred,
        balance: financeiraBalance,
        totalPaidInstallments,
        totalDownPayments
      },
      loja: {
        totalRepassesRecebidos: totalTransferred,
        totalEntradasDiretas: extraLojaIn,
        totalSaidas: extraLojaOut,
        balance: lojaBalance
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

    // 1. Tentar salvar em cashier_transfers no Supabase
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
      type: 'out',
      amount: transferAmount,
      description: `[REPASSE] ${description || 'Repasse para Caixa Loja'}`,
      cashier_type: 'FINANCEIRA',
      created_at: new Date().toISOString()
    };

    const txLojaIn = {
      id: 'ctx_loj_' + Date.now(),
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
    const { data, error } = await supabase
      .from('cashier_transfers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error && error.code !== '42P01') {
      console.warn('Aviso ao consultar cashier_transfers:', error.message);
    }

    return res.json(data || []);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});
