import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import crypto from "crypto";
import { getOrCreateAsaasCustomer, createAsaasPayment, getAsaasPaymentBarcode, getAsaasPaymentPix } from "../services/asaasService.js";

const router = Router();

// Get all installments
router.get("/installments", async (req, res) => {
  const { data, error } = await supabase
    .from('installments')
    .select('*, sales(*, customers(*))')
    .order('due_date', { ascending: true });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create installments
router.post("/installments", async (req, res) => {
  const installments = Array.isArray(req.body) ? req.body : [req.body];
  if (installments.length === 0) {
    return res.status(400).json({ error: "Nenhuma parcela enviada." });
  }

  try {
    // 1. Verificar se a venda é do tipo crediario
    const firstInst = installments[0];
    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .select('payment_type, customer_id, store_id, device_model_manual')
      .eq('id', firstInst.sale_id)
      .maybeSingle();

    if (saleErr) {
      console.error("Erro ao buscar dados da venda para Asaas:", saleErr);
    }

    let asaasCustomerId: string | null = null;
    let syncErrorOccurred = false;

    if (sale && sale.payment_type === 'crediario') {
      // Buscar dados do cliente
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .select('*')
        .eq('id', sale.customer_id)
        .maybeSingle();

      if (custErr || !customer) {
        console.error("Erro ao buscar dados do cliente para Asaas:", custErr);
      } else {
        // Se o cliente já tiver asaas_customer_id, usa ele. Se não, cria um novo no Asaas
        try {
          if (customer.asaas_customer_id) {
            asaasCustomerId = customer.asaas_customer_id;
          } else {
            asaasCustomerId = await getOrCreateAsaasCustomer({
              name: customer.name,
              cpfCnpj: customer.cpf,
              phone: customer.phone,
              email: customer.email,
              address: customer.address
            });
            // Salvar no BD local
            await supabase
              .from('customers')
              .update({ asaas_customer_id: asaasCustomerId })
              .eq('id', customer.id);
          }
        } catch (err) {
          console.error("Erro ao cadastrar cliente no Asaas:", err);
          syncErrorOccurred = true;
        }
      }
    }

    // 2. Mapear e preparar a inserção das parcelas
    const preparedInstallments = [];

    for (const inst of installments) {
      const instId = crypto.randomUUID();
      let asaasPaymentId: string | null = null;
      let asaasInvoiceUrl: string | null = null;
      let asaasSyncStatus = 'synced';

      // Se temos o asaasCustomerId, tentar registrar cobrança no Asaas
      if (asaasCustomerId && !syncErrorOccurred) {
        try {
          const paymentResult = await createAsaasPayment({
            customer: asaasCustomerId,
            billingType: 'UNDEFINED',
            value: Number(inst.value),
            dueDate: inst.due_date,
            externalReference: instId,
            description: `Crediário MDR - Parcela ${inst.installment_number || inst.number}/${inst.total_installments || inst.total} - ${sale?.device_model_manual || 'Dispositivo'}`,
            fine: { value: 2.0, type: 'PERCENTAGE' },
            interest: { value: 1.0, type: 'PERCENTAGE' },
            discount: { value: 1.0, dueDateLimitDays: 30, type: 'PERCENTAGE' }
          });
          asaasPaymentId = paymentResult.id;
          asaasInvoiceUrl = paymentResult.invoiceUrl;
        } catch (err) {
          console.error("Erro ao registrar cobrança no Asaas:", err);
          asaasSyncStatus = 'pending_sync';
        }
      } else if (sale && sale.payment_type === 'crediario') {
        // Se a venda é crediário mas deu erro de cadastro de cliente, marca como pendente
        asaasSyncStatus = 'pending_sync';
      }

      preparedInstallments.push({
        id: instId,
        sale_id: inst.sale_id,
        installment_number: inst.installment_number || inst.number,
        total_installments: inst.total_installments || inst.total,
        value: Number(inst.value),
        due_date: inst.due_date,
        status: inst.status || 'pending',
        asaas_payment_id: asaasPaymentId,
        asaas_invoice_url: asaasInvoiceUrl,
        asaas_sync_status: asaasSyncStatus
      });
    }

    const { data, error } = await supabase
      .from('installments')
      .insert(preparedInstallments)
      .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err: any) {
    console.error("Erro no fluxo do Asaas em POST /installments:", err);
    return res.status(500).json({ error: err.message || "Erro interno ao processar parcelas." });
  }
});

// Update installment & Integrate with cash transactions and active cashier shifts
router.patch("/installments/:id", async (req, res) => {
  const { status, payment_date, payment_method, value, created_by, bypassShiftValidation } = req.body;

  // 1. Fetch current installment to get current values
  const { data: current, error: getErr } = await supabase
    .from('installments')
    .select('*, sales(store_id, customer_id)')
    .eq('id', req.params.id)
    .single();

  if (getErr || !current) return res.status(404).json({ error: "Installment not found" });

  const unitId = current.sales?.store_id || current.unit_id;
  const pm = payment_method || 'pix';
  const amount = Number(value !== undefined ? value : current.value);

  // If status is transitioning to paid
  let activeShift: any = null;
  if (status === 'paid') {
    // Find active shift
    const { data: shift } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('unit_id', unitId)
      .eq('status', 'open')
      .maybeSingle();
    activeShift = shift;

    // Payment receipt requires cashier shift to be open, unless bypassed
    if (!activeShift && !bypassShiftValidation) {
      return res.status(400).json({ error: 'Caixa fechado. Abra o caixa para receber pagamentos nesta unidade.' });
    }
  }

  // 2. Perform the update (exclude bypassShiftValidation from the payload)
  const updatePayload = { ...req.body };
  delete updatePayload.bypassShiftValidation;

  const { data, error } = await supabase
    .from('installments')
    .update(updatePayload)
    .eq('id', req.params.id)
    .select('*, sales(*, customers(*))')
    .single();

  if (error) return res.status(404).json({ error: error.message });

  // 3. Integrate with cash flow
  if (status === 'paid') {
    // Check if transaction already exists
    const { data: existingTx } = await supabase
      .from('cash_transactions')
      .select('id')
      .eq('installment_id', req.params.id)
      .maybeSingle();

    if (!existingTx) {
      // Get customer name
      let customerName = 'Cliente';
      if (data.sales?.customers?.name) {
        customerName = data.sales.customers.name;
      }

      await supabase
        .from('cash_transactions')
        .insert({
          unit_id: unitId,
          shift_id: activeShift?.id || null,
          type: 'inflow',
          category: 'installment',
          amount,
          payment_method: pm,
          description: `Recebimento de parcela #${data.installment_number} de ${customerName}`,
          installment_id: data.id,
          created_by: created_by || activeShift?.opened_by || data.sales?.created_by || '00000000-0000-0000-0000-000000000000'
        });

      // Update shift expected balances if shift is open
      if (activeShift) {
        const isCash = pm === 'money';
        const updatePayload: Record<string, any> = {};
        if (isCash) {
          updatePayload.expected_cash = Number(activeShift.expected_cash) + amount;
        } else {
          updatePayload.expected_digital = Number(activeShift.expected_digital) + amount;
        }
        await supabase
          .from('cash_shifts')
          .update(updatePayload)
          .eq('id', activeShift.id);
      }
    }
  } else if (status === 'pending' || status === 'overdue') {
    // If reverting payment, delete transaction and adjust shift balances
    const { data: tx } = await supabase
      .from('cash_transactions')
      .select('*')
      .eq('installment_id', req.params.id)
      .maybeSingle();

    if (tx) {
      if (tx.shift_id) {
        // Find shift
        const { data: shift } = await supabase
          .from('cash_shifts')
          .select('*')
          .eq('id', tx.shift_id)
          .maybeSingle();

        if (shift && shift.status === 'open') {
          const isCash = tx.payment_method === 'money';
          const updatePayload: Record<string, any> = {};
          if (isCash) {
            updatePayload.expected_cash = Math.max(0, Number(shift.expected_cash) - Number(tx.amount));
          } else {
            updatePayload.expected_digital = Math.max(0, Number(shift.expected_digital) - Number(tx.amount));
          }
          await supabase
            .from('cash_shifts')
            .update(updatePayload)
            .eq('id', shift.id);
        }
      }

      // Delete transaction
      await supabase
        .from('cash_transactions')
        .delete()
        .eq('id', tx.id);
    }
  }

  res.json(data);
});

// GET /api/finance/shifts/active
router.get("/shifts/active", async (req, res) => {
  const { unit_id } = req.query;
  if (!unit_id) return res.status(400).json({ error: "unit_id is required" });

  const { data, error } = await supabase
    .from('cash_shifts')
    .select('*, opened_by:profiles!cash_shifts_opened_by_fkey(full_name)')
    .eq('unit_id', unit_id)
    .eq('status', 'open')
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/finance/shifts/open
router.post("/shifts/open", async (req, res) => {
  const { unit_id, opened_by, opening_balance } = req.body;
  if (!unit_id || !opened_by) return res.status(400).json({ error: "unit_id and opened_by are required" });

  // Verify if there is already an open shift
  const { data: existing } = await supabase
    .from('cash_shifts')
    .select('id')
    .eq('unit_id', unit_id)
    .eq('status', 'open')
    .maybeSingle();

  if (existing) return res.status(400).json({ error: "Já existe um caixa aberto para esta unidade." });

  const { data, error } = await supabase
    .from('cash_shifts')
    .insert({
      unit_id,
      opened_by,
      opening_balance: Number(opening_balance) || 0,
      expected_cash: Number(opening_balance) || 0,
      expected_digital: 0,
      status: 'open'
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// POST /api/finance/shifts/close
router.post("/shifts/close", async (req, res) => {
  const { shift_id, closed_by, closing_cash, notes } = req.body;
  if (!shift_id || !closed_by) return res.status(400).json({ error: "shift_id and closed_by are required" });

  // Get active shift
  const { data: activeShift, error: getErr } = await supabase
    .from('cash_shifts')
    .select('*')
    .eq('id', shift_id)
    .single();

  if (getErr || !activeShift) return res.status(404).json({ error: "Shift not found" });
  if (activeShift.status === 'closed') return res.status(400).json({ error: "Caixa já se encontra fechado." });

  const physicalCount = Number(closing_cash) || 0;
  const expected = Number(activeShift.expected_cash);
  const diff = physicalCount - expected;

  const { data, error } = await supabase
    .from('cash_shifts')
    .update({
      closed_by,
      closed_at: new Date().toISOString(),
      closing_cash: physicalCount,
      difference: diff,
      status: 'closed',
      notes
    })
    .eq('id', shift_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/finance/shifts/history
router.get("/shifts/history", async (req, res) => {
  const { unit_id } = req.query;
  if (!unit_id) return res.status(400).json({ error: "unit_id is required" });

  const { data, error } = await supabase
    .from('cash_shifts')
    .select('*, opened_by:profiles!cash_shifts_opened_by_fkey(full_name), closed_by:profiles!cash_shifts_closed_by_fkey(full_name)')
    .eq('unit_id', unit_id)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/finance/shifts/:id
router.patch("/shifts/:id", async (req, res) => {
  const { id } = req.params;
  const { opening_balance, closing_cash, notes } = req.body;

  // 1. Fetch current shift
  const { data: current, error: getErr } = await supabase
    .from('cash_shifts')
    .select('*')
    .eq('id', id)
    .single();

  if (getErr || !current) return res.status(404).json({ error: "Shift not found" });

  const newOpening = opening_balance !== undefined ? Number(opening_balance) : Number(current.opening_balance);
  const newClosing = closing_cash !== undefined ? Number(closing_cash) : Number(current.closing_cash || 0);

  // Recalculate expected_cash if opening_balance changed
  const diffOpening = newOpening - Number(current.opening_balance);
  const newExpected = Number(current.expected_cash) + diffOpening;
  const newDiff = newClosing - newExpected;

  const { data, error } = await supabase
    .from('cash_shifts')
    .update({
      opening_balance: newOpening,
      closing_cash: newClosing,
      expected_cash: newExpected,
      difference: newDiff,
      notes: notes !== undefined ? notes : current.notes
    })
    .eq('id', id)
    .select('*, opened_by:profiles!cash_shifts_opened_by_fkey(full_name), closed_by:profiles!cash_shifts_closed_by_fkey(full_name)')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/finance/shifts/:id
router.delete("/shifts/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('cash_shifts')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});


// GET /api/finance/transactions
router.get("/transactions", async (req, res) => {
  const { unit_id } = req.query;
  let query = supabase
    .from('cash_transactions')
    .select('*, created_by:profiles!cash_transactions_created_by_fkey(full_name)');

  if (unit_id && unit_id !== 'all') {
    query = query.eq('unit_id', unit_id);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/finance/transactions
router.post("/transactions", async (req, res) => {
  const { unit_id, type, category, amount, payment_method, description, created_by } = req.body;
  
  if (!unit_id || !type || !category || !amount || !payment_method || !created_by) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Get active shift
  const { data: activeShift } = await supabase
    .from('cash_shifts')
    .select('*')
    .eq('unit_id', unit_id)
    .eq('status', 'open')
    .maybeSingle();

  // Manual transactions require cashier to be open
  if (!activeShift) {
    return res.status(400).json({ error: "Lançamentos financeiros exigem um caixa aberto nesta unidade." });
  }

  const valueNum = Number(amount);

  const { data, error } = await supabase
    .from('cash_transactions')
    .insert({
      unit_id,
      shift_id: activeShift?.id || null,
      type,
      category,
      amount: valueNum,
      payment_method,
      description,
      created_by
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Update shift expected balances if shift is open
  if (activeShift) {
    const isCash = payment_method === 'money';
    const isOutflow = type === 'outflow';
    const multiplier = isOutflow ? -1 : 1;
    const delta = valueNum * multiplier;

    const updatePayload: Record<string, any> = {};
    if (isCash) {
      updatePayload.expected_cash = Number(activeShift.expected_cash) + delta;
    } else {
      updatePayload.expected_digital = Number(activeShift.expected_digital) + delta;
    }

    await supabase
      .from('cash_shifts')
      .update(updatePayload)
      .eq('id', activeShift.id);
  }

  res.status(201).json(data);
});

// DELETE /api/finance/transactions/:id
router.delete("/transactions/:id", async (req, res) => {
  const { id } = req.params;

  // 1. Fetch current transaction details
  const { data: tx, error: getErr } = await supabase
    .from('cash_transactions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (getErr || !tx) return res.status(404).json({ error: "Transaction not found" });

  // 2. Adjust shift balances if the shift is open
  if (tx.shift_id) {
    const { data: shift } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('id', tx.shift_id)
      .maybeSingle();

    if (shift && shift.status === 'open') {
      const isCash = tx.payment_method === 'money';
      const isOutflow = tx.type === 'outflow';
      // Reverting transaction: if it was outflow (subtracted), we add it back. If it was inflow (added), we subtract it.
      const multiplier = isOutflow ? 1 : -1;
      const delta = Number(tx.amount) * multiplier;

      const updatePayload: Record<string, any> = {};
      if (isCash) {
        updatePayload.expected_cash = Number(shift.expected_cash) + delta;
      } else {
        updatePayload.expected_digital = Number(shift.expected_digital) + delta;
      }

      await supabase
        .from('cash_shifts')
        .update(updatePayload)
        .eq('id', shift.id);
    }
  }

  // 3. Delete the transaction
  const { error: delErr } = await supabase
    .from('cash_transactions')
    .delete()
    .eq('id', id);

  if (delErr) return res.status(500).json({ error: delErr.message });

  res.json({ success: true });
});

// Send WhatsApp collection alert trigger for a crediario installment
router.post("/installments/:id/notify", async (req, res) => {
  try {
    // 1. Fetch installment details with customer and sales info
    const { data: inst, error } = await supabase
      .from('installments')
      .select('*, sales(*, customers(*))')
      .eq('id', req.params.id)
      .single();

    if (error || !inst || !inst.sales?.customers) {
      return res.status(404).json({ error: "Parcela ou Cliente inválido para cobrança" });
    }

    // 2. Get connected WhatsApp channel
    const { data: channels } = await supabase
      .from('automation_channels')
      .select('*')
      .eq('status', 'connected')
      .limit(1);

    if (!channels || channels.length === 0) {
      return res.status(400).json({ error: "Nenhum canal do WhatsApp conectado para disparar cobranças" });
    }

    const instance = channels[0].instance_name;
    let cleanPhone = inst.sales.customers.phone.replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = `55${cleanPhone}`;
    }
    const remoteJid = `${cleanPhone}@s.whatsapp.net`;

    const valueStr = Number(inst.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formattedDueDate = new Date(inst.due_date).toLocaleDateString('pt-BR');

    // Create the message text
    const messageText = `⚠️ *Lembrete de Pagamento - MDR Informática & Celulares* ⚠️\n\n` +
      `Olá *${inst.sales.customers.name}*!\n\n` +
      `Lembramos que a sua parcela de número *${inst.number}/${inst.total}* no valor de *${valueStr}* possui o vencimento agendado para o dia *${formattedDueDate}*.\n\n` +
      `Para sua comodidade, você pode realizar o pagamento via PIX ou diretamente em uma de nossas lojas.\n\n` +
      `Caso já tenha efetuado o pagamento, por favor desconsidere este aviso.`;

    // 3. Dispatch to n8n Webhook
    const n8nWebhookUrl = `${process.env.N8N_API_URL}/webhook/cobranca-crediario`;
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
      },
      body: JSON.stringify({
        instanceName: instance,
        remoteJid: remoteJid,
        text: messageText,
        customerName: inst.sales.customers.name,
        installmentNumber: `${inst.number}/${inst.total}`,
        dueDate: formattedDueDate,
        value: valueStr
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Failed to notify via n8n:', errText);
      // Fallback: send directly through Evolution API using CRM's endpoint
      const fallbackUrl = `${req.protocol}://${req.get('host')}/api/chat/send`;
      await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName: instance,
          remoteJid: remoteJid,
          text: messageText
        })
      });
    }

    res.json({ success: true, message: "Lembrete enviado com sucesso!" });
  } catch (err: any) {
    console.error('WhatsApp installment notify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sync an existing installment to Asaas manually
router.post("/installments/:id/sync-asaas", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch installment details
    const { data: inst, error: instErr } = await supabase
      .from('installments')
      .select('*, sales(*, customers(*))')
      .eq('id', id)
      .single();

    if (instErr || !inst) {
      return res.status(404).json({ error: "Parcela não encontrada." });
    }

    if (inst.asaas_invoice_url) {
      return res.json(inst);
    }

    // 2. Resolve Asaas customer id
    const customer = inst.sales?.customers;
    if (!customer) {
      return res.status(400).json({ error: "Cliente não associado a esta venda." });
    }

    let asaasCustomerId = customer.asaas_customer_id;
    if (!asaasCustomerId) {
      asaasCustomerId = await getOrCreateAsaasCustomer({
        name: customer.name,
        cpfCnpj: customer.cpf,
        phone: customer.phone,
        email: customer.email,
        address: customer.address
      });
      // Save it locally
      await supabase
        .from('customers')
        .update({ asaas_customer_id: asaasCustomerId })
        .eq('id', customer.id);
    }

    // 3. Check for legacy installment and add fee if needed
    let finalValue = Number(inst.value);
    if (inst.sales?.payment_type === 'crediario') {
      const createdAtDate = inst.created_at ? new Date(inst.created_at) : new Date();
      const isLegacy = createdAtDate < new Date('2026-06-18T00:00:00Z');
      if (isLegacy) {
        finalValue = Number(inst.value) + 1.99;
        await supabase
          .from('installments')
          .update({ value: finalValue })
          .eq('id', id);
      }
    }

    // 4. Register payment on Asaas
    const paymentResult = await createAsaasPayment({
      customer: asaasCustomerId,
      billingType: 'UNDEFINED',
      value: finalValue,
      dueDate: inst.due_date,
      externalReference: inst.id,
      description: `Crediário MDR - Parcela ${inst.installment_number || inst.number}/${inst.total_installments || inst.total} - ${inst.sales?.device_model_manual || 'Dispositivo'}`,
      fine: { value: 2.0, type: 'PERCENTAGE' },
      interest: { value: 1.0, type: 'PERCENTAGE' },
      discount: { value: 1.0, dueDateLimitDays: 30, type: 'PERCENTAGE' }
    });

    // 5. Update installment details
    const { data: updatedInst, error: updateErr } = await supabase
      .from('installments')
      .update({
        asaas_payment_id: paymentResult.id,
        asaas_invoice_url: paymentResult.invoiceUrl,
        asaas_sync_status: 'synced'
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return res.status(500).json({ error: updateErr.message });
    }

    res.json(updatedInst);
  } catch (err: any) {
    console.error("Erro ao sincronizar parcela com Asaas:", err);
    res.status(500).json({ error: err.message || "Erro ao gerar cobrança no Asaas." });
  }
});

// Fetch Asaas details (barcode & Pix QR code)
router.get("/installments/:id/asaas-details", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: inst, error: instErr } = await supabase
      .from('installments')
      .select('asaas_payment_id, asaas_invoice_url')
      .eq('id', id)
      .maybeSingle();

    if (instErr || !inst) {
      return res.status(404).json({ error: "Parcela não encontrada." });
    }

    if (!inst.asaas_payment_id) {
      return res.status(400).json({ error: "Esta parcela não possui cobrança registrada no Asaas." });
    }

    let barcode: string | null = null;
    let barCodeNumber: string | null = null;
    let pixPayload: string | null = null;
    let pixImage: string | null = null;

    try {
      const barcodeRes = await getAsaasPaymentBarcode(inst.asaas_payment_id);
      barcode = barcodeRes.identificationField || null;
      barCodeNumber = barcodeRes.barCode || null;
    } catch (e) {
      console.warn("Erro ao obter código de barras do Asaas:", e);
    }

    try {
      const pixRes = await getAsaasPaymentPix(inst.asaas_payment_id);
      pixPayload = pixRes.payload;
      pixImage = pixRes.encodedImage;
    } catch (e) {
      console.warn("Erro ao obter Pix do Asaas:", e);
    }

    res.json({
      barcode,
      barCodeNumber,
      pixPayload,
      pixImage,
      invoiceUrl: inst.asaas_invoice_url
    });
  } catch (err: any) {
    console.error("Erro ao obter detalhes do Asaas:", err);
    res.status(500).json({ error: err.message || "Erro interno ao buscar dados do Asaas." });
  }
});

export default router;
