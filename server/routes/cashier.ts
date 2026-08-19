import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';

export const cashierRouter = Router();

// GET /api/cashier/summary - Retorna os saldos segregados com D+2, origens e trava de saldo
cashierRouter.get('/summary', async (req, res) => {
  try {
    const { storeId } = req.query;
    const targetUnitId = (storeId && storeId !== 'all') ? String(storeId) : null;

    // 1. Buscar parcelas pagas no Supabase com relação às vendas e clientes
    const { data: paidInstallments, error: instErr } = await supabase
      .from('installments')
      .select('id, status, value, origin_type, payment_method, payment_date, created_at, installment_number, total_installments, sales(id, origin_type, store_id, down_payment, payment_type, payment_method, customer_id, customers(id, name, cpf))')
      .or('status.eq.paid,status.eq.pago,payment_date.not.is.null');
    
    if (instErr) console.warn('Aviso ao buscar parcelas pagas:', instErr.message);

    let totalFinanceiraInstallments = 0;
    let totalLojaInstallments = 0;

    let disponivelD0 = 0;
    let liquidandoD2 = 0;

    const now = new Date();
    const TWO_BUSINESS_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 2 dias

    const pendingRepasseItems: any[] = [];

    (paidInstallments || []).forEach((inst: any) => {
      // Se targetUnitId for especificado e a venda for de outra unidade, ignorar
      if (targetUnitId && inst.sales?.store_id && String(inst.sales.store_id) !== targetUnitId) {
        return;
      }

      const val = Number(inst.value) || 0;
      const isCard = inst.payment_method === 'card' ||
                     inst.payment_method === 'debit' ||
                     inst.sales?.payment_type === 'card' ||
                     inst.sales?.payment_type === 'debit' ||
                     inst.sales?.payment_method === 'card' ||
                     inst.sales?.payment_method === 'debit';

      // Vendas de 1 parcela única (balcão, acessórios, telas, peças) ou crediário loja pertencem à LOJA
      const isSingleOrLoja = (inst.total_installments === 1) ||
                             inst.origin_type === 'CREDIARIO_LOJA' ||
                             inst.sales?.origin_type === 'CREDIARIO_LOJA';

      if (isSingleOrLoja) {
        totalLojaInstallments += val;
        return;
      }

      // Se for parcela de entrada (installment_number === 0, flag is_down_payment ou parcela 1 igual ao valor da entrada), pertence à LOJA
      const isDownPaymentInst = inst.installment_number === 0 ||
                                inst.is_down_payment === true ||
                                (inst.installment_number === 1 && inst.sales?.down_payment > 0 && Number(inst.value) === Number(inst.sales.down_payment));
      if (isDownPaymentInst) {
        totalLojaInstallments += val;
        return;
      }

      // Pertence à financeira se for de financiamento de celular ou venda de aparelho com parcelas
      const isFinanc = inst.origin_type === 'FINANCIAMENTO_CELULAR' ||
        inst.sales?.origin_type === 'FINANCIAMENTO_CELULAR' ||
        (inst.total_installments && inst.total_installments > 1 && inst.origin_type !== 'CREDIARIO_LOJA');

      if (isFinanc) {
        totalFinanceiraInstallments += val;

        // Calcular se está em D+2 ou D+0
        const payDateStr = inst.payment_date || inst.created_at;
        const payDate = payDateStr ? new Date(payDateStr) : now;
        const diffMs = now.getTime() - payDate.getTime();

        const isD0 = inst.payment_method === 'money' || diffMs >= TWO_BUSINESS_DAYS_MS;

        if (isD0) {
          disponivelD0 += val;
        } else {
          liquidandoD2 += val;
        }
      } else {
        totalLojaInstallments += val;
      }
    });

    // 2. Buscar vendas para entradas e repasse de contratos de financiamento
    let salesQuery = supabase
      .from('sales')
      .select('id, total_value, original_price, down_payment, origin_type, store_id, device_model_manual, sale_date, created_at, installments_count, payment_type, customers(id, name, cpf), stores(id, name)');
    
    if (targetUnitId) {
      salesQuery = salesQuery.eq('store_id', targetUnitId);
    }

    const { data: salesData, error: salesErr } = await salesQuery;
    if (salesErr) console.warn('Aviso ao buscar vendas:', salesErr.message);

    // 3. Buscar transações de caixa diretas e repasses anteriores
    let cashTxsQuery = supabase
      .from('cash_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (targetUnitId) {
      cashTxsQuery = cashTxsQuery.eq('unit_id', targetUnitId);
    }

    const { data: cashTxs, error: cashErr } = await cashTxsQuery;
    if (cashErr) console.warn('Aviso ao buscar transações de caixa:', cashErr.message);

    // Identificar contratos já repassados e histórico de repasses
    const repassedSaleIds = new Set<string>();
    const transfersData: any[] = [];
    let totalTransferred = 0;

    (cashTxs || []).forEach((tx: any) => {
      const desc = tx.description || '';
      const isRepasse = desc.includes('[REPASSE') || tx.category === 'repasse';

      if (isRepasse && tx.cashier_type === 'FINANCEIRA' && (tx.type === 'out' || tx.type === 'outflow')) {
        totalTransferred += Number(tx.amount) || 0;
        transfersData.push({
          id: tx.id,
          created_at: tx.created_at,
          amount: Number(tx.amount) || 0,
          notes: tx.description,
          store_id: tx.unit_id,
          units: tx.unit_id ? { name: 'Loja Física' } : null
        });

        const match = desc.match(/Contratos:\s*([a-f0-9\-,]+)/i);
        if (match && match[1]) {
          match[1].split(',').forEach((id: string) => repassedSaleIds.add(id.trim()));
        }
      }
    });

    let totalFinancDownPayments = 0;
    const financDownPaymentsList: any[] = [];

    let totalOutrasDownPayments = 0;
    const outrasDownPaymentsList: any[] = [];

    (salesData || []).forEach((sale: any) => {
      const down = Number(sale.down_payment) || 0;
      const cust = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
      const store = Array.isArray(sale.stores) ? sale.stores[0] : sale.stores;
      const isFinanc = sale.origin_type === 'FINANCIAMENTO_CELULAR';
      const isMultiInstallment = Number(sale.installments_count) > 1;

      if (down > 0) {
        const item = {
          id: sale.id,
          customerName: cust?.name || 'Cliente Balcão',
          customerCpf: cust?.cpf || '',
          deviceModel: sale.device_model_manual || 'Aparelho / Produto',
          downPayment: down,
          date: sale.created_at,
          originType: sale.origin_type
        };

        if (isFinanc) {
          totalFinancDownPayments += down;
          financDownPaymentsList.push(item);
        } else {
          totalOutrasDownPayments += down;
          outrasDownPaymentsList.push(item);
        }
      }

      // Repasse de Contrato para a Loja: valor do aparelho financiado a repassar (original_price ou total_value menos entrada paga na loja)
      if (isFinanc && isMultiInstallment && !repassedSaleIds.has(sale.id)) {
        const originalPrice = Number(sale.original_price || sale.total_value || 0);
        const netRepasse = Math.max(0, originalPrice - down);

        if (netRepasse > 0) {
          pendingRepasseItems.push({
            id: sale.id,
            saleId: sale.id,
            customerName: cust?.name || 'Cliente Sem Nome',
            customerCpf: cust?.cpf || '',
            deviceModel: sale.device_model_manual || 'Smartphone Financiado',
            totalValue: Number(sale.total_value || 0),
            originalPrice: originalPrice,
            downPayment: down,
            value: netRepasse,
            installmentsCount: sale.installments_count || 1,
            saleDate: sale.sale_date || sale.created_at,
            storeId: sale.store_id,
            storeName: store?.name || '',
            isCleared: true
          });
        }
      }
    });

    const totalLojaDownPayments = totalFinancDownPayments + totalOutrasDownPayments;

    const extraFinanceiraIn = (cashTxs || [])
      .filter((t: any) => t.cashier_type === 'FINANCEIRA' && (t.type === 'in' || t.type === 'inflow') && !t.sale_id && !t.installment_id && !(t.description || '').includes('[REPASSE'))
      .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

    const extraFinanceiraOut = (cashTxs || [])
      .filter((t: any) => t.cashier_type === 'FINANCEIRA' && (t.type === 'out' || t.type === 'outflow') && !(t.description || '').includes('[REPASSE'))
      .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

    const totalFinanceiraArrecadado = totalFinanceiraInstallments + extraFinanceiraIn - extraFinanceiraOut;
    const saldoDisponivelReal = Math.max(0, disponivelD0 - totalTransferred);

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
        disponivelD0: disponivelD0,
        liquidandoD2: liquidandoD2,
        saldoDisponivelReal: saldoDisponivelReal,
        totalRepassado: totalTransferred,
        totalPaidInstallments: totalFinanceiraInstallments,
        totalDownPayments: 0
      },
      loja: {
        totalRepassesRecebidos: totalTransferred,
        totalEntradasDiretas: totalLojaEntradasDiretas,
        totalFinancDownPayments,
        financDownPaymentsList,
        totalOutrasDownPayments,
        outrasDownPaymentsList,
        totalSaidas: extraLojaOut,
        balance: lojaBalance,
        totalPaidInstallments: totalLojaInstallments,
        totalDownPayments: totalLojaDownPayments
      },
      pendingRepasseItems,
      recentTransfers: transfersData.slice(0, 20)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao calcular resumo dos caixas.' });
  }
});

// POST /api/cashier/transfer - Realiza o repasse de contratos da Financeira para a Loja Física
cashierRouter.post('/transfer', async (req, res) => {
  try {
    const { amount, description, transferredBy, storeId, originAccount, selectedContractIds, contractIds, installmentIds, selectedInstallmentIds } = req.body;
    const transferAmount = Number(amount);

    if (!transferAmount || isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ error: 'Informe um valor de repasse válido maior que zero.' });
    }

    const targetContractIds: string[] = selectedContractIds || contractIds || selectedInstallmentIds || installmentIds || [];
    const contractsListStr = targetContractIds.length > 0 ? ` | Contratos: ${targetContractIds.join(',')}` : '';

    let effectiveStoreId = storeId && storeId !== 'all' ? storeId : null;
    if (!effectiveStoreId) {
      const { data: firstStore } = await supabase.from('stores').select('id').limit(1).maybeSingle();
      effectiveStoreId = firstStore?.id || null;
    }

    let effectiveProfileId = transferredBy || (req as any).user?.id || null;
    if (!effectiveProfileId) {
      const { data: firstProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
      effectiveProfileId = firstProfile?.id || null;
    }

    const transferId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // 1. Registrar saída no Caixa Financeira e entrada no Caixa Loja em cash_transactions
    const txFinanceiraOut = {
      id: crypto.randomUUID(),
      unit_id: effectiveStoreId,
      type: 'outflow',
      category: 'sangria',
      amount: transferAmount,
      description: `[REPASSE_FINANCEIRA] ${description || 'Repasse de contratos de financiamento para Caixa Loja'}${contractsListStr}`,
      cashier_type: 'FINANCEIRA',
      created_by: effectiveProfileId,
      created_at: nowIso
    };

    const txLojaIn = {
      id: crypto.randomUUID(),
      unit_id: effectiveStoreId,
      type: 'inflow',
      category: 'suprimento',
      amount: transferAmount,
      description: `[REPASSE_FINANCEIRA] ${description || 'Repasse de contratos de financiamento recebido da Financeira'}${contractsListStr}`,
      cashier_type: 'LOJA',
      created_by: effectiveProfileId,
      created_at: nowIso
    };

    const { error: txErr } = await supabase
      .from('cash_transactions')
      .insert([txFinanceiraOut, txLojaIn]);

    if (txErr) {
      console.warn('Aviso ao registrar cash_transactions de repasse:', txErr.message);
    }

    return res.json({
      success: true,
      message: 'Repasse de contratos executado com sucesso!',
      transferId,
      amount: transferAmount,
      repassedContractsCount: targetContractIds.length
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao processar repasse de contratos.' });
  }
});

// POST /api/cashier/revert-transfer - Estorna um repasse anterior
cashierRouter.post('/revert-transfer', async (req, res) => {
  try {
    const { transferId } = req.body;
    if (!transferId) {
      return res.status(400).json({ error: 'ID do repasse não informado.' });
    }

    // Excluir a transação de repasse em cash_transactions
    const { error: delErr } = await supabase
      .from('cash_transactions')
      .delete()
      .eq('id', transferId);

    if (delErr) {
      console.warn('Aviso ao estornar repasse:', delErr.message);
    }

    return res.json({ success: true, message: 'Repasse estornado com sucesso!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao estornar repasse.' });
  }
});

// GET /api/cashier/transactions - Listar transações/despesas da financeira
cashierRouter.get('/transactions', async (req, res) => {
  try {
    const { cashierType, storeId } = req.query;
    let query = supabase
      .from('cash_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (cashierType) {
      query = query.eq('cashier_type', String(cashierType));
    }
    if (storeId && storeId !== 'all') {
      query = query.eq('unit_id', String(storeId));
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Aviso ao buscar cash_transactions:', error.message);
      return res.json({ success: true, transactions: [] });
    }

    return res.json({ success: true, transactions: data || [] });
  } catch (error: any) {
    console.warn('Aviso ao consultar transações de caixa:', error.message);
    return res.json({ success: true, transactions: [] });
  }
});

// POST /api/cashier/transactions - Criar nova despesa/lançamento
cashierRouter.post('/transactions', async (req, res) => {
  try {
    const { type, amount, description, paymentMethod, cashierType, unitId, userId, category } = req.body;
    
    if (!amount || Number(amount) <= 0 || !description) {
      return res.status(400).json({ error: 'Informe valor e descrição válidos.' });
    }

    // Resolver unit_id obrigatório
    let storeUnitId = unitId && unitId !== 'all' ? unitId : null;
    if (!storeUnitId) {
      const { data: firstStore } = await supabase.from('stores').select('id').limit(1).maybeSingle();
      storeUnitId = firstStore?.id || null;
    }

    // Resolver created_by obrigatório
    let createdBy = userId || (req as any).user?.id || null;
    if (!createdBy) {
      const { data: firstProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
      createdBy = firstProfile?.id || null;
    }

    // Normalizar type ('inflow' / 'outflow') e category compatível com constraints
    const normType = (type === 'in' || type === 'inflow') ? 'inflow' : 'outflow';
    let normCategory = category;
    if (!normCategory || !['sale', 'installment', 'sangria', 'suprimento', 'os', 'outros'].includes(normCategory)) {
      normCategory = normType === 'inflow' ? 'suprimento' : 'sangria';
    }

    const newTx = {
      id: crypto.randomUUID(),
      unit_id: storeUnitId,
      type: normType,
      category: normCategory,
      amount: Number(amount),
      description: String(description).trim(),
      payment_method: paymentMethod || 'pix',
      cashier_type: cashierType || 'FINANCEIRA',
      created_by: createdBy,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('cash_transactions')
      .insert([newTx])
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir cash_transaction:', error.message);
      throw error;
    }

    return res.json({ success: true, transaction: data || newTx });
  } catch (error: any) {
    console.error('Erro no POST /api/cashier/transactions:', error.message);
    return res.status(500).json({ error: error.message || 'Erro ao criar transação.' });
  }
});

// PUT /api/cashier/transactions/:id - Editar despesa/lançamento
cashierRouter.put('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, description, paymentMethod, unitId, category } = req.body;

    const updateData: any = {};
    if (type) {
      const normType = (type === 'in' || type === 'inflow') ? 'inflow' : 'outflow';
      updateData.type = normType;
      if (!category) {
        updateData.category = normType === 'inflow' ? 'suprimento' : 'sangria';
      }
    }
    if (category) {
      updateData.category = ['sale', 'installment', 'sangria', 'suprimento', 'os', 'outros'].includes(category)
        ? category
        : (updateData.type === 'inflow' ? 'suprimento' : 'sangria');
    }
    if (amount) updateData.amount = Number(amount);
    if (description) updateData.description = String(description).trim();
    if (paymentMethod) updateData.payment_method = paymentMethod;
    if (unitId !== undefined && unitId && unitId !== 'all') updateData.unit_id = unitId;

    const { data, error } = await supabase
      .from('cash_transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, transaction: data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao atualizar transação.' });
  }
});

// DELETE /api/cashier/transactions/:id - Excluir despesa/lançamento
cashierRouter.delete('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('cash_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.json({ success: true, message: 'Lançamento removido com sucesso.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro ao excluir transação.' });
  }
});
