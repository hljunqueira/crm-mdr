import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import crypto from "crypto";
import { getOrCreateAsaasCustomer, createAsaasPayment, getAsaasPaymentBarcode, getAsaasPaymentPix, deleteAsaasPayment } from "../services/asaasService.js";
import { processScpInstallmentPayout } from "./scp_payout_trigger.js";
import { formatWhatsAppJid } from "../lib/phoneHelper.js";
import { updateCustomerStatus } from "../utils/customerStatus.js";

import { db } from "../db/connection.js";
import { installments, sales, customers, cashShifts, cashTransactions, notificationQueue, profiles } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

const useSupabase = (req: any) => {
  const host = req.headers.host || '';
  return host.includes('mdrinformaticaecelulares.com.br') || 
         process.env.IS_VPS === 'true' || 
         (!host.includes('localhost') && !host.includes('127.0.0.1'));
};

function snakeToCamel(str: string): string {
  return str.replace(/([-_][a-z])/g, group =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function mapLocalToCloud(tableName: string, data: any): any {
  const result: any = {};
  for (const k of Object.keys(data)) {
    let pgKey = camelToSnake(k);
    if (k === 'storeId') pgKey = 'store_id';
    else if (k === 'customerId') pgKey = 'customer_id';
    else if (k === 'sellerId') pgKey = 'seller_id';
    else if (k === 'deviceId') pgKey = 'device_id';
    else if (k === 'saleId') pgKey = 'sale_id';
    else if (k === 'installmentNumber') pgKey = 'installment_number';
    else if (k === 'totalInstallments') pgKey = 'total_installments';
    else if (k === 'dueDate') pgKey = 'due_date';
    else if (k === 'paymentDate') pgKey = 'payment_date';
    else if (k === 'paymentMethod') pgKey = 'payment_method';
    else if (k === 'asaasPaymentId') pgKey = 'asaas_payment_id';
    else if (k === 'asaasInvoiceUrl') pgKey = 'asaas_invoice_url';
    else if (k === 'asaasSyncStatus') pgKey = 'asaas_sync_status';
    else if (k === 'openedBy') pgKey = 'opened_by';
    else if (k === 'closedBy') pgKey = 'closed_by';
    else if (k === 'openedAt') pgKey = 'opened_at';
    else if (k === 'closedAt') pgKey = 'closed_at';
    else if (k === 'openingBalance') pgKey = 'opening_balance';
    else if (k === 'closingBalance') pgKey = 'closing_balance';
    result[pgKey] = data[k];
  }
  return result;
}

// Get all installments
router.get("/installments", async (req, res) => {
  const { unit_id } = req.query;

  if (useSupabase(req)) {
    let query = supabase
      .from('installments')
      .select('*, sales!inner(*, customers(*))');

    if (unit_id && unit_id !== 'all') {
      query = query.eq('sales.store_id', unit_id);
    }

    const { data, error } = await query.order('due_date', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // SQLite local fallback
  try {
    const list = await db.select({
      id: installments.id,
      saleId: installments.saleId,
      installmentNumber: installments.installmentNumber,
      totalInstallments: installments.totalInstallments,
      value: installments.value,
      dueDate: installments.dueDate,
      paymentDate: installments.paymentDate,
      status: installments.status,
      paymentMethod: installments.paymentMethod,
      asaasPaymentId: installments.asaasPaymentId,
      asaasInvoiceUrl: installments.asaasInvoiceUrl,
      asaasSyncStatus: installments.asaasSyncStatus,
      createdAt: installments.createdAt,
      saleStoreId: sales.storeId,
      saleCustomerId: sales.customerId,
      saleTotalValue: sales.totalValue,
      customerName: customers.name,
      customerPhone: customers.phone
    })
    .from(installments)
    .leftJoin(sales, eq(installments.saleId, sales.id))
    .leftJoin(customers, eq(sales.customerId, customers.id))
    .orderBy(installments.dueDate);

    const formatted = list.map(inst => ({
      id: inst.id,
      sale_id: inst.saleId,
      installment_number: inst.installmentNumber,
      total_installments: inst.totalInstallments,
      value: inst.value,
      due_date: inst.dueDate,
      payment_date: inst.paymentDate,
      status: inst.status,
      payment_method: inst.paymentMethod,
      asaas_payment_id: inst.asaasPaymentId,
      asaas_invoice_url: inst.asaasInvoiceUrl,
      asaas_sync_status: inst.asaasSyncStatus,
      created_at: inst.createdAt,
      sales: {
        id: inst.saleId,
        store_id: inst.saleStoreId,
        customer_id: inst.saleCustomerId,
        total_value: inst.saleTotalValue,
        customers: inst.customerName ? { name: inst.customerName, phone: inst.customerPhone } : null
      }
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create installments
router.post("/installments", async (req, res) => {
  const list = Array.isArray(req.body) ? req.body : [req.body];
  if (list.length === 0) {
    return res.status(400).json({ error: "Nenhuma parcela enviada." });
  }

  if (useSupabase(req)) {
    try {
      const firstInst = list[0];
      const { data: sale } = await supabase
        .from('sales')
        .select('payment_type, customer_id, store_id, device_model_manual')
        .eq('id', firstInst.sale_id)
        .maybeSingle();

      let asaasCustomerId: string | null = null;
      let syncErrorOccurred = false;

      if (sale && sale.payment_type === 'crediario') {
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('id', sale.customer_id)
          .maybeSingle();

        if (customer) {
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

      const preparedInstallments = [];
      for (const inst of list) {
        const instId = crypto.randomUUID();
        let asaasPaymentId: string | null = null;
        let asaasInvoiceUrl: string | null = null;
        let asaasSyncStatus = 'synced';

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

      if (data && Array.isArray(data)) {
        for (const inst of data) {
          if (inst.status === 'paid') {
            processScpInstallmentPayout(inst.id, Number(inst.value)).catch(err => {
              console.error("[SCP Payout Trigger Error]", err);
            });
          }
        }
      }

      return res.status(201).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // SQLite local fallback
  try {
    const localPayloads = [];
    for (const inst of list) {
      const instId = crypto.randomUUID();
      const localInst = {
        id: instId,
        saleId: inst.sale_id,
        installmentNumber: Number(inst.installment_number || inst.number),
        totalInstallments: Number(inst.total_installments || inst.total),
        value: Number(inst.value),
        dueDate: inst.due_date,
        status: inst.status || 'pending',
        asaasSyncStatus: 'pending_sync',
        syncStatus: 'pending_insert',
        updatedAt: new Date().toISOString()
      };
      await db.insert(installments).values(localInst);

      const pgPayload = mapLocalToCloud('installments', localInst);
      // syncQueue insert removed (Supabase native mode)
      localPayloads.push(pgPayload);
    }
    res.status(201).json(localPayloads);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update installment
router.patch("/installments/:id", async (req, res) => {
  const { status, payment_date, payment_method, value, created_by, bypassShiftValidation } = req.body;

  if (useSupabase(req)) {
    const { data: current, error: getErr } = await supabase
      .from('installments')
      .select('*, sales(store_id, customer_id)')
      .eq('id', req.params.id)
      .single();

    if (getErr || !current) return res.status(404).json({ error: "Installment not found" });

    const unitId = current.sales?.store_id || current.unit_id;
    const pm = payment_method || 'pix';
    const amount = Number(value !== undefined ? value : current.value);

    let activeShift: any = null;
    if (status === 'paid') {
      const { data: shift } = await supabase
        .from('cash_shifts')
        .select('*')
        .eq('unit_id', unitId)
        .eq('status', 'open')
        .maybeSingle();
      activeShift = shift;

      if (!activeShift && !bypassShiftValidation) {
        return res.status(400).json({ error: 'Caixa fechado. Abra o caixa para receber pagamentos nesta unidade.' });
      }
    }

    const updatePayload = { ...req.body };
    delete updatePayload.bypassShiftValidation;

    if (status === 'paid') {
      updatePayload.paid_value = amount;
      const originalVal = Number(current.value);
      if (amount < originalVal) {
        updatePayload.discount_value = originalVal - amount;
        updatePayload.interest_value = 0;
      } else if (amount > originalVal) {
        updatePayload.interest_value = amount - originalVal;
        updatePayload.discount_value = 0;
      } else {
        updatePayload.discount_value = 0;
        updatePayload.interest_value = 0;
      }
    } else if (status === 'pending' || status === 'overdue') {
      updatePayload.paid_value = null;
      updatePayload.discount_value = 0;
      updatePayload.interest_value = 0;
    }

    const { data, error } = await supabase
      .from('installments')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select('*, sales(*, customers(*))')
      .single();

    if (error) return res.status(404).json({ error: error.message });

    if (status === 'paid') {
      const { data: existingTx } = await supabase
        .from('cash_transactions')
        .select('id')
        .eq('installment_id', req.params.id)
        .maybeSingle();

      if (!existingTx) {
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

        if (activeShift) {
          const isCash = pm === 'money';
          const updateShiftPayload: Record<string, any> = {};
          if (isCash) {
            updateShiftPayload.expected_cash = Number(activeShift.expected_cash) + amount;
          } else {
            updateShiftPayload.expected_digital = Number(activeShift.expected_digital) + amount;
          }
          await supabase
            .from('cash_shifts')
            .update(updateShiftPayload)
            .eq('id', activeShift.id);
        }
      }

      if (current.asaas_payment_id) {
        deleteAsaasPayment(current.asaas_payment_id).catch(err => {
          console.warn(`[Finance Route] Erro ao cancelar cobrança ${current.asaas_payment_id} no Asaas ao receber parcela manualmente:`, err);
        });
      }

      processScpInstallmentPayout(req.params.id, amount).catch(err => {
        console.error("[SCP Payout Trigger Error]", err);
      });
    } else if (status === 'pending' || status === 'overdue') {
      const { data: tx } = await supabase
        .from('cash_transactions')
        .select('*')
        .eq('installment_id', req.params.id)
        .maybeSingle();

      if (tx) {
        if (tx.shift_id) {
          const { data: shift } = await supabase
            .from('cash_shifts')
            .select('*')
            .eq('id', tx.shift_id)
            .maybeSingle();

          if (shift && shift.status === 'open') {
            const isCash = tx.payment_method === 'money';
            const updateShiftPayload: Record<string, any> = {};
            if (isCash) {
              updateShiftPayload.expected_cash = Math.max(0, Number(shift.expected_cash) - Number(tx.amount));
            } else {
              updateShiftPayload.expected_digital = Math.max(0, Number(shift.expected_digital) - Number(tx.amount));
            }
            await supabase
              .from('cash_shifts')
              .update(updateShiftPayload)
              .eq('id', shift.id);
          }
        }
        await supabase
          .from('cash_transactions')
        .delete()
          .eq('id', tx.id);
      }
    }

    if (data && data.sales?.customer_id) {
      await updateCustomerStatus(data.sales.customer_id);
    }

    return res.json(data);
  }

  // SQLite local fallback
  try {
    const [current] = await db.select().from(installments).where(eq(installments.id, req.params.id)).limit(1);
    if (!current) return res.status(404).json({ error: "Installment not found" });

    const updateDataLocal: any = {};
    for (const key of Object.keys(req.body)) {
      const camelKey = snakeToCamel(key);
      updateDataLocal[camelKey] = req.body[key];
    }
    updateDataLocal.syncStatus = 'pending_update';
    updateDataLocal.updatedAt = new Date().toISOString();

    await db.update(installments).set(updateDataLocal).where(eq(installments.id, req.params.id));

    const [updatedInst] = await db.select().from(installments).where(eq(installments.id, req.params.id)).limit(1);

    const pgPayload = mapLocalToCloud('installments', updatedInst);

    // syncQueue insert removed (Supabase native mode)

    res.json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET shifts active
router.get("/shifts/active", async (req, res) => {
  const { unit_id } = req.query;
  if (!unit_id) return res.status(400).json({ error: "unit_id is required" });

  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('cash_shifts')
      .select('*, opened_by:profiles!cash_shifts_opened_by_fkey(full_name)')
      .eq('unit_id', unit_id)
      .eq('status', 'open')
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // SQLite fallback
  try {
    const [shift] = await db.select().from(cashShifts).where(and(eq(cashShifts.storeId, unit_id as string), eq(cashShifts.status, 'open'))).limit(1);
    if (!shift) return res.json(null);
    
    const [openedProfile] = await db.select().from(profiles).where(eq(profiles.id, shift.openedBy || '')).limit(1);

    res.json({
      id: shift.id,
      unit_id: shift.storeId,
      opened_by: openedProfile ? { full_name: openedProfile.fullName } : null,
      opened_at: shift.openedAt,
      opening_balance: shift.openingBalance,
      status: shift.status,
      notes: shift.notes
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST shifts open
router.post("/shifts/open", async (req, res) => {
  const { unit_id, opened_by, opening_balance } = req.body;
  if (!unit_id || !opened_by) return res.status(400).json({ error: "unit_id and opened_by are required" });

  if (useSupabase(req)) {
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
    return res.status(201).json(data);
  }

  // SQLite fallback
  try {
    const [existing] = await db.select().from(cashShifts).where(and(eq(cashShifts.storeId, unit_id), eq(cashShifts.status, 'open'))).limit(1);
    if (existing) return res.status(400).json({ error: "Já existe um caixa aberto para esta unidade." });

    const id = crypto.randomUUID();
    const newShift = {
      id,
      storeId: unit_id,
      openedBy: opened_by,
      openedAt: new Date().toISOString(),
      openingBalance: Number(opening_balance) || 0,
      status: 'open',
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };

    await db.insert(cashShifts).values(newShift);

    const pgPayload = mapLocalToCloud('cash_shifts', newShift);
    // syncQueue insert removed (Supabase native mode)

    res.status(201).json(pgPayload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST shifts close
router.post("/shifts/close", async (req, res) => {
  const { shift_id, closed_by, closing_cash, notes } = req.body;
  if (!shift_id || !closed_by) return res.status(400).json({ error: "shift_id and closed_by are required" });

  if (useSupabase(req)) {
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
    return res.json(data);
  }

  // SQLite fallback
  try {
    const [activeShift] = await db.select().from(cashShifts).where(eq(cashShifts.id, shift_id)).limit(1);
    if (!activeShift) return res.status(404).json({ error: "Shift not found" });
    if (activeShift.status === 'closed') return res.status(400).json({ error: "Caixa já se encontra fechado." });

    const updateDataLocal = {
      closedBy: closed_by,
      closedAt: new Date().toISOString(),
      closingBalance: Number(closing_cash) || 0,
      status: 'closed',
      notes,
      syncStatus: 'pending_update',
      updatedAt: new Date().toISOString()
    };

    await db.update(cashShifts).set(updateDataLocal).where(eq(cashShifts.id, shift_id));

    const [updated] = await db.select().from(cashShifts).where(eq(cashShifts.id, shift_id)).limit(1);

    const pgPayload = mapLocalToCloud('cash_shifts', updated);
    // syncQueue insert removed (Supabase native mode)

    res.json(pgPayload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET shifts history
router.get("/shifts/history", async (req, res) => {
  const { unit_id } = req.query;
  if (!unit_id) return res.status(400).json({ error: "unit_id is required" });

  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('cash_shifts')
      .select('*, opened_by:profiles!cash_shifts_opened_by_fkey(full_name), closed_by:profiles!cash_shifts_closed_by_fkey(full_name)')
      .eq('unit_id', unit_id)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // SQLite fallback
  try {
    const list = await db.select().from(cashShifts).where(and(eq(cashShifts.storeId, unit_id as string), eq(cashShifts.status, 'closed'))).orderBy(desc(cashShifts.closedAt));
    const formatted = [];
    for (const s of list) {
      const [openedProfile] = await db.select().from(profiles).where(eq(profiles.id, s.openedBy || '')).limit(1);
      const [closedProfile] = await db.select().from(profiles).where(eq(profiles.id, s.closedBy || '')).limit(1);
      formatted.push({
        id: s.id,
        unit_id: s.storeId,
        opened_by: openedProfile ? { full_name: openedProfile.fullName } : null,
        closed_by: closedProfile ? { full_name: closedProfile.fullName } : null,
        opened_at: s.openedAt,
        closed_at: s.closedAt,
        opening_balance: s.openingBalance,
        closing_cash: s.closingBalance,
        notes: s.notes
      });
    }
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH cash shifts
router.patch("/shifts/:id", async (req, res) => {
  const { id } = req.params;
  const { opening_balance, closing_cash, notes } = req.body;

  if (useSupabase(req)) {
    const { data: current, error: getErr } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('id', id)
      .single();

    if (getErr || !current) return res.status(404).json({ error: "Shift not found" });

    const newOpening = opening_balance !== undefined ? Number(opening_balance) : Number(current.opening_balance);
    const newClosing = closing_cash !== undefined ? Number(closing_cash) : Number(current.closing_cash || 0);

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
    return res.json(data);
  }

  // SQLite fallback
  try {
    const [current] = await db.select().from(cashShifts).where(eq(cashShifts.id, id)).limit(1);
    if (!current) return res.status(404).json({ error: "Shift not found" });

    const updateDataLocal = {
      openingBalance: opening_balance !== undefined ? Number(opening_balance) : current.openingBalance,
      closingBalance: closing_cash !== undefined ? Number(closing_cash) : current.closingBalance,
      notes: notes !== undefined ? notes : current.notes,
      syncStatus: 'pending_update',
      updatedAt: new Date().toISOString()
    };

    await db.update(cashShifts).set(updateDataLocal).where(eq(cashShifts.id, id));

    const [updated] = await db.select().from(cashShifts).where(eq(cashShifts.id, id)).limit(1);

    const pgPayload = mapLocalToCloud('cash_shifts', updated);
    // syncQueue insert removed (Supabase native mode)

    res.json(pgPayload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE cash shifts
router.delete("/shifts/:id", async (req, res) => {
  const { id } = req.params;

  if (useSupabase(req)) {
    const { error } = await supabase
      .from('cash_shifts')
      .delete()
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  // SQLite fallback
  try {
    const [current] = await db.select().from(cashShifts).where(eq(cashShifts.id, id)).limit(1);
    if (!current) return res.status(404).json({ error: "Shift not found" });

    await db.delete(cashShifts).where(eq(cashShifts.id, id));

    // syncQueue insert removed (Supabase native mode)

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/finance/transactions
router.get("/transactions", async (req, res) => {
  const { unit_id } = req.query;

  if (useSupabase(req)) {
    let query = supabase
      .from('cash_transactions')
      .select('*, created_by:profiles!cash_transactions_created_by_fkey(full_name)');

    if (unit_id && unit_id !== 'all') {
      query = query.eq('unit_id', unit_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // SQLite fallback
  try {
    const list = await db.select({
      id: cashTransactions.id,
      shiftId: cashTransactions.shiftId,
      type: cashTransactions.type,
      amount: cashTransactions.amount,
      description: cashTransactions.description,
      paymentMethod: cashTransactions.paymentMethod,
      voucherId: cashTransactions.voucherId,
      createdAt: cashTransactions.createdAt,
      profileFullName: profiles.fullName
    })
    .from(cashTransactions)
    .leftJoin(profiles, eq(cashTransactions.voucherId, profiles.id)) // dummy profile join
    .orderBy(desc(cashTransactions.createdAt));

    const formatted = list.map(tx => ({
      id: tx.id,
      shift_id: tx.shiftId,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      payment_method: tx.paymentMethod,
      voucher_id: tx.voucherId,
      created_at: tx.createdAt,
      created_by: tx.profileFullName ? { full_name: tx.profileFullName } : null
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/finance/transactions
router.post("/transactions", async (req, res) => {
  const { unit_id, type, category, amount, payment_method, description, created_by } = req.body;
  
  if (!unit_id || !type || !category || !amount || !payment_method || !created_by) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (useSupabase(req)) {
    const { data: activeShift } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('unit_id', unit_id)
      .eq('status', 'open')
      .maybeSingle();

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

    if (activeShift) {
      const isCash = payment_method === 'money';
      const isOutflow = type === 'outflow';
      const multiplier = isOutflow ? -1 : 1;
      const delta = valueNum * multiplier;

      const updateShiftPayload: Record<string, any> = {};
      if (isCash) {
        updateShiftPayload.expected_cash = Number(activeShift.expected_cash) + delta;
      } else {
        updateShiftPayload.expected_digital = Number(activeShift.expected_digital) + delta;
      }

      await supabase
        .from('cash_shifts')
        .update(updateShiftPayload)
        .eq('id', activeShift.id);
    }

    return res.status(201).json(data);
  }

  // SQLite fallback
  try {
    const [activeShift] = await db.select().from(cashShifts).where(and(eq(cashShifts.storeId, unit_id), eq(cashShifts.status, 'open'))).limit(1);
    if (!activeShift) {
      return res.status(400).json({ error: "Lançamentos financeiros exigem um caixa aberto nesta unidade." });
    }

    const id = crypto.randomUUID();
    const newTx = {
      id,
      shiftId: activeShift.id,
      type,
      amount: Number(amount),
      description,
      paymentMethod: payment_method,
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };

    await db.insert(cashTransactions).values(newTx);

    const pgPayload = {
      id: newTx.id,
      shift_id: newTx.shiftId,
      type: newTx.type,
      amount: newTx.amount,
      description: newTx.description,
      payment_method: newTx.paymentMethod,
      unit_id,
      category,
      created_by
    };

    // syncQueue insert removed (Supabase native mode)

    res.status(201).json(pgPayload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/finance/transactions/:id
router.delete("/transactions/:id", async (req, res) => {
  const { id } = req.params;

  if (useSupabase(req)) {
    const { data: tx, error: getErr } = await supabase
      .from('cash_transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (getErr || !tx) return res.status(404).json({ error: "Transaction not found" });

    if (tx.shift_id) {
      const { data: shift } = await supabase
        .from('cash_shifts')
        .select('*')
        .eq('id', tx.shift_id)
        .maybeSingle();

      if (shift && shift.status === 'open') {
        const isCash = tx.payment_method === 'money';
        const isOutflow = tx.type === 'outflow';
        const multiplier = isOutflow ? 1 : -1;
        const delta = Number(tx.amount) * multiplier;

        const updateShiftPayload: Record<string, any> = {};
        if (isCash) {
          updateShiftPayload.expected_cash = Number(shift.expected_cash) + delta;
        } else {
          updateShiftPayload.expected_digital = Number(shift.expected_digital) + delta;
        }

        await supabase
          .from('cash_shifts')
          .update(updateShiftPayload)
          .eq('id', shift.id);
      }
    }

    const { error: delErr } = await supabase
      .from('cash_transactions')
      .delete()
      .eq('id', id);

    if (delErr) return res.status(500).json({ error: delErr.message });
    return res.json({ success: true });
  }

  // SQLite fallback
  try {
    const [tx] = await db.select().from(cashTransactions).where(eq(cashTransactions.id, id)).limit(1);
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    await db.delete(cashTransactions).where(eq(cashTransactions.id, id));

    // syncQueue insert removed (Supabase native mode)

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send WhatsApp collection alert trigger for a crediario installment
router.post("/installments/:id/notify", async (req, res) => {
  try {
    if (useSupabase(req)) {
      const { data: inst, error } = await supabase
        .from('installments')
        .select('*, sales(*, customers(*))')
        .eq('id', req.params.id)
        .single();

      if (error || !inst || !inst.sales?.customers) {
        return res.status(404).json({ error: "Parcela ou Cliente inválido para cobrança" });
      }

      const unitId = inst.sales.store_id || inst.sales.customers.unit_id;
      let { data: channels } = await supabase
        .from('automation_channels')
        .select('*')
        .eq('status', 'connected')
        .eq('unit_id', unitId)
        .limit(1);

      if (!channels || channels.length === 0) {
        const { data: fallbackChannels } = await supabase
          .from('automation_channels')
          .select('*')
          .eq('status', 'connected')
          .limit(1);
        channels = fallbackChannels;
      }

      if (!channels || channels.length === 0) {
        return res.status(400).json({ error: "Nenhum canal do WhatsApp conectado para disparar cobranças" });
      }

      const instance = channels[0].instance_name;
      const remoteJid = formatWhatsAppJid(inst.sales.customers.phone);

      const valueStr = Number(inst.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const formattedDueDate = new Date(inst.due_date + 'T12:00:00').toLocaleDateString('pt-BR');

      const messageText = `⚠️ *Lembrete de Pagamento - MDR Informática & Celulares* ⚠️\n\n` +
        `Olá, ${(inst.sales.customers.name || "").trim().toUpperCase()}!\n\n` +
        `Lembramos que a sua parcela de número *${inst.number}/${inst.total}* no valor de *${valueStr}* possui o vencimento agendado para o dia *${formattedDueDate}*.\n\n` +
        (inst.asaas_invoice_url ? `🔗 *Link para Pagamento (Boleto/PIX):*\n${inst.asaas_invoice_url}\n\n` : '') +
        `Para sua comodidade, você pode realizar o pagamento pelo link acima, via PIX ou diretamente em uma de nossas lojas.\n\n` +
        `Caso já tenha efetuado o pagamento, por favor desconsidere este aviso.`;

      const n8nWebhookUrl = `${process.env.N8N_API_URL}/webhook/cobranca-crediario`;
      
      try {
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
          throw new Error("HTTP " + response.status);
        }
      } catch (err) {
        // Queue it locally if it fails
        await db.insert(notificationQueue).values({
          url: n8nWebhookUrl,
          method: 'POST',
          headers: JSON.stringify({
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
          }),
          body: JSON.stringify({
            instanceName: instance,
            remoteJid: remoteJid,
            text: messageText,
            customerName: inst.sales.customers.name,
            installmentNumber: `${inst.number}/${inst.total}`,
            dueDate: formattedDueDate,
            value: valueStr
          }),
          attempts: 1,
          lastError: 'Direct webhook collection alert failed'
        });
      }

      return res.json({ success: true, message: "Lembrete enviado (ou agendado) com sucesso!" });
    }

    // Local Offline Trigger (always queued)
    const [instLocal] = await db.select().from(installments).where(eq(installments.id, req.params.id)).limit(1);
    if (!instLocal) return res.status(404).json({ error: "Parcela não encontrada" });

    const [saleLocal] = await db.select().from(sales).where(eq(sales.id, instLocal.saleId || '')).limit(1);
    const [custLocal] = await db.select().from(customers).where(eq(customers.id, saleLocal?.customerId || '')).limit(1);

    if (!custLocal) return res.status(444).json({ error: "Cliente inválido para notificações" });

    const instance = 'MDR';
    const remoteJid = formatWhatsAppJid(custLocal.phone || '');
    const messageText = `⚠️ *Lembrete de Pagamento - MDR* - Parcela no valor de R$ ${instLocal.value} vencendo em ${instLocal.dueDate}.`;

    const n8nWebhookUrl = `${process.env.N8N_API_URL}/webhook/cobranca-crediario`;

    await db.insert(notificationQueue).values({
      url: n8nWebhookUrl,
      method: 'POST',
      headers: JSON.stringify({
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
      }),
      body: JSON.stringify({
        instanceName: instance,
        remoteJid: remoteJid,
        text: messageText,
        customerName: custLocal.name,
        installmentNumber: `${instLocal.installmentNumber}/${instLocal.totalInstallments}`,
        dueDate: instLocal.dueDate,
        value: String(instLocal.value)
      }),
      attempts: 0
    });

    res.json({ success: true, message: "Notificação de cobrança enfileirada offline com sucesso!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sync Asaas stub fallback
router.post("/installments/:id/sync-asaas", async (req, res) => {
  try {
    if (useSupabase(req)) {
      // online logic from before
      const { id } = req.params;
      const { data: inst, error: instErr } = await supabase.from('installments').select('*, sales(*, customers(*))').eq('id', id).single();
      if (instErr || !inst) return res.status(404).json({ error: "Parcela não encontrada." });
      if (inst.asaas_invoice_url) return res.json(inst);

      const customer = inst.sales?.customers;
      if (!customer) return res.status(400).json({ error: "Cliente não associado a esta venda." });

      let asaasCustomerId = customer.asaas_customer_id;
      if (!asaasCustomerId) {
        asaasCustomerId = await getOrCreateAsaasCustomer({
          name: customer.name,
          cpfCnpj: customer.cpf,
          phone: customer.phone,
          email: customer.email,
          address: customer.address
        });
        await supabase.from('customers').update({ asaas_customer_id: asaasCustomerId }).eq('id', customer.id);
      }

      let finalValue = Number(inst.value);
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

      if (updateErr) return res.status(500).json({ error: updateErr.message });
      return res.json(updatedInst);
    }

    // Offline fallback: mark as pending_sync to resolve on next sync cycle
    const [instLocal] = await db.select().from(installments).where(eq(installments.id, req.params.id)).limit(1);
    if (!instLocal) return res.status(404).json({ error: "Parcela não encontrada." });

    await db.update(installments).set({ asaasSyncStatus: 'pending_sync' }).where(eq(installments.id, req.params.id));
    const [updated] = await db.select().from(installments).where(eq(installments.id, req.params.id)).limit(1);

    res.json(mapLocalToCloud('installments', updated));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Asaas details details stub
router.get("/installments/:id/asaas-details", async (req, res) => {
  try {
    if (useSupabase(req)) {
      const { id } = req.params;
      const { data: inst } = await supabase.from('installments').select('asaas_payment_id, asaas_invoice_url').eq('id', id).maybeSingle();
      if (!inst || !inst.asaas_payment_id) return res.status(400).json({ error: "Esta parcela não possui cobrança registrada no Asaas." });

      let barcode: string | null = null;
      let barCodeNumber: string | null = null;
      let pixPayload: string | null = null;
      let pixImage: string | null = null;

      try {
        const barcodeRes = await getAsaasPaymentBarcode(inst.asaas_payment_id);
        barcode = barcodeRes.identificationField || null;
        barCodeNumber = barcodeRes.barCode || null;
      } catch (e) {}

      try {
        const pixRes = await getAsaasPaymentPix(inst.asaas_payment_id);
        pixPayload = pixRes.payload;
        pixImage = pixRes.encodedImage;
      } catch (e) {}

      return res.json({ barcode, barCodeNumber, pixPayload, pixImage, invoiceUrl: inst.asaas_invoice_url });
    }

    // Offline stub
    res.json({
      barcode: "Offline - Sincronize para gerar boleto",
      barCodeNumber: "00000000000000000000000000000000000000000000000",
      pixPayload: "Offline - Sincronize para obter PIX",
      pixImage: "",
      invoiceUrl: ""
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
