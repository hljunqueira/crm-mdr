import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { db } from "../db/connection.js";
import { commissionSettings, employeeVouchers, profiles, cashShifts, cashTransactions, syncQueue } from "../db/schema.js";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import crypto from "crypto";

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
    if (k === 'profileId') pgKey = 'profile_id';
    else if (k === 'salesCommissionPct') pgKey = 'sales_commission_pct';
    else if (k === 'servicesCommissionPct') pgKey = 'services_commission_pct';
    else if (k === 'baseSalary') pgKey = 'base_salary';
    else if (k === 'salesGoalBonusPct') pgKey = 'sales_goal_bonus_pct';
    else if (k === 'salesGoalBonusFixed') pgKey = 'sales_goal_bonus_fixed';
    else if (k === 'osGoalBonusFixed') pgKey = 'os_goal_bonus_fixed';
    else if (k === 'unitId') pgKey = 'unit_id';
    else if (k === 'paymentMethod') pgKey = 'payment_method';
    else if (k === 'voucherDate') pgKey = 'voucher_date';
    else if (k === 'shiftId') pgKey = 'shift_id';
    result[pgKey] = data[k];
  }
  return result;
}

// GET settings
router.get("/settings", async (req, res) => {
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('commission_settings')
      .select('*, profiles(id, full_name, role)');
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data || []);
  }

  // SQLite fallback
  try {
    const result = await db.select({
      id: commissionSettings.id,
      profileId: commissionSettings.profileId,
      salesCommissionPct: commissionSettings.salesCommissionPct,
      servicesCommissionPct: commissionSettings.servicesCommissionPct,
      baseSalary: commissionSettings.baseSalary,
      salesGoalBonusPct: commissionSettings.salesGoalBonusPct,
      salesGoalBonusFixed: commissionSettings.salesGoalBonusFixed,
      osGoalBonusFixed: commissionSettings.osGoalBonusFixed,
      createdAt: commissionSettings.createdAt,
      profileFullName: profiles.fullName,
      profileRole: profiles.role
    })
    .from(commissionSettings)
    .leftJoin(profiles, eq(commissionSettings.profileId, profiles.id));

    const formatted = result.map(r => ({
      id: r.id,
      profile_id: r.profileId,
      sales_commission_pct: r.salesCommissionPct,
      services_commission_pct: r.servicesCommissionPct,
      base_salary: r.baseSalary,
      sales_goal_bonus_pct: r.salesGoalBonusPct,
      sales_goal_bonus_fixed: r.salesGoalBonusFixed,
      os_goal_bonus_fixed: r.osGoalBonusFixed,
      created_at: r.createdAt,
      profiles: r.profileFullName ? { id: r.profileId, full_name: r.profileFullName, role: r.profileRole } : null
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST settings
router.post("/settings", async (req, res) => {
  const {
    profile_id,
    sales_commission_pct,
    services_commission_pct,
    base_salary,
    sales_goal_bonus_pct,
    sales_goal_bonus_fixed,
    os_goal_bonus_fixed
  } = req.body;

  if (!profile_id) {
    return res.status(400).json({ error: "profile_id é obrigatório." });
  }

  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('commission_settings')
      .upsert({
        profile_id,
        sales_commission_pct: parseFloat(sales_commission_pct || 0),
        services_commission_pct: parseFloat(services_commission_pct || 0),
        base_salary: parseFloat(base_salary || 0),
        sales_goal_bonus_pct: parseFloat(sales_goal_bonus_pct || 0),
        sales_goal_bonus_fixed: parseFloat(sales_goal_bonus_fixed || 0),
        os_goal_bonus_fixed: parseFloat(os_goal_bonus_fixed || 0),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'profile_id'
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  }

  // SQLite fallback
  try {
    const [existing] = await db.select().from(commissionSettings).where(eq(commissionSettings.profileId, profile_id)).limit(1);
    const id = existing?.id || crypto.randomUUID();

    const upsertData: any = {
      id,
      profileId: profile_id,
      salesCommissionPct: Number(sales_commission_pct || 0),
      servicesCommissionPct: Number(services_commission_pct || 0),
      baseSalary: Number(base_salary || 0),
      salesGoalBonusPct: Number(sales_goal_bonus_pct || 0),
      salesGoalBonusFixed: Number(sales_goal_bonus_fixed || 0),
      osGoalBonusFixed: Number(os_goal_bonus_fixed || 0),
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };

    if (existing) {
      upsertData.syncStatus = 'pending_update';
      await db.update(commissionSettings).set(upsertData).where(eq(commissionSettings.id, id));
    } else {
      await db.insert(commissionSettings).values(upsertData);
    }

    const pgPayload = mapLocalToCloud('commission_settings', upsertData);
    await db.insert(syncQueue).values({
      tableName: 'commission_settings',
      action: existing ? 'UPDATE' : 'INSERT',
      recordId: id,
      payload: JSON.stringify(pgPayload)
    });

    res.json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET vouchers
router.get("/vouchers", async (req, res) => {
  const { unit_id, profile_id, start_date, end_date } = req.query;

  if (useSupabase(req)) {
    let query = supabase
      .from('employee_vouchers')
      .select('*, profiles:profiles!employee_vouchers_profile_id_fkey(full_name), creator:profiles!employee_vouchers_created_by_fkey(full_name)');

    if (unit_id && unit_id !== 'all') {
      query = query.eq('unit_id', unit_id);
    }
    if (profile_id) {
      query = query.eq('profile_id', profile_id);
    }
    if (start_date) {
      query = query.gte('voucher_date', start_date);
    }
    if (end_date) {
      query = query.lte('voucher_date', end_date);
    }

    const { data, error } = await query.order('voucher_date', { ascending: false });
    if (error) return res.status(400).json({ error: error.message });
    return res.json(data || []);
  }

  // SQLite fallback
  try {
    const list = await db.select().from(employeeVouchers).orderBy(desc(employeeVouchers.voucherDate));
    const formatted = [];
    for (const v of list) {
      const [empProfile] = await db.select().from(profiles).where(eq(profiles.id, v.profileId || '')).limit(1);
      const [creatorProfile] = await db.select().from(profiles).where(eq(profiles.id, v.createdBy || '')).limit(1);
      
      formatted.push({
        id: v.id,
        profile_id: v.profileId,
        unit_id: v.unitId,
        amount: v.amount,
        payment_method: v.paymentMethod,
        type: v.type,
        description: v.description,
        voucher_date: v.voucherDate,
        shift_id: v.shiftId,
        created_by: v.createdBy,
        created_at: v.createdAt,
        profiles: empProfile ? { full_name: empProfile.fullName } : null,
        creator: creatorProfile ? { full_name: creatorProfile.fullName } : null
      });
    }

    // Apply basic filter on array if needed, otherwise return all
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST vouchers
router.post("/vouchers", async (req, res) => {
  const {
    profile_id,
    unit_id,
    amount,
    payment_method,
    type,
    description,
    voucher_date,
    created_by
  } = req.body;

  if (!profile_id || !unit_id || !amount || !payment_method || !type) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes." });
  }

  if (useSupabase(req)) {
    let activeShiftId = null;
    let activeShift: any = null;

    if (payment_method === 'money') {
      const { data, error: shiftError } = await supabase
        .from('cash_shifts')
        .select('*')
        .eq('unit_id', unit_id)
        .eq('status', 'open')
        .maybeSingle();

      if (shiftError) return res.status(400).json({ error: shiftError.message });
      if (!data) {
        return res.status(400).json({ error: "Não há turno de caixa aberto para esta unidade. Abra o caixa antes de realizar retiradas em dinheiro." });
      }

      activeShift = data;
      const currentCashInDrawer = Number(activeShift.expected_cash || 0);
      if (currentCashInDrawer < parseFloat(amount)) {
        return res.status(400).json({ error: `Saldo físico em dinheiro insuficiente na gaveta. Saldo atual: R$ ${currentCashInDrawer.toFixed(2)}.` });
      }
      activeShiftId = activeShift.id;
    }

    const { data: voucher, error: voucherError } = await supabase
      .from('employee_vouchers')
      .insert({
        profile_id,
        unit_id,
        amount: parseFloat(amount),
        payment_method,
        type,
        description,
        voucher_date: voucher_date || new Date().toLocaleDateString('en-CA'),
        shift_id: activeShiftId,
        created_by
      })
      .select()
      .single();

    if (voucherError) return res.status(400).json({ error: voucherError.message });

    if (payment_method === 'money' && activeShiftId) {
      const typeLabel = type === 'pro_labore' ? 'Retirada Pró-labore' : type === 'profit_distribution' ? 'Retirada de Lucros' : 'Vale Funcionário';
      const { data: employee } = await supabase.from('profiles').select('full_name').eq('id', profile_id).maybeSingle();
      const employeeName = employee?.full_name || 'Funcionário';

      const { error: txError } = await supabase
        .from('cash_transactions')
        .insert({
          unit_id,
          shift_id: activeShiftId,
          type: 'outflow',
          category: 'outros',
          amount: parseFloat(amount),
          payment_method: 'money',
          description: `${typeLabel} - Beneficiário: ${employeeName} (${description || ''})`,
          created_by,
          voucher_id: voucher.id
        });

      if (txError) {
        await supabase.from('employee_vouchers').delete().eq('id', voucher.id);
        return res.status(400).json({ error: `Falha ao integrar com o caixa: ${txError.message}` });
      }

      const newExpectedCash = Number(activeShift.expected_cash || 0) - parseFloat(amount);
      await supabase.from('cash_shifts').update({ expected_cash: newExpectedCash }).eq('id', activeShiftId);
    }

    return res.json(voucher);
  }

  // SQLite fallback
  try {
    const id = crypto.randomUUID();
    const newVoucher = {
      id,
      profileId: profile_id,
      unitId: unit_id,
      amount: Number(amount),
      paymentMethod: payment_method,
      type,
      description,
      voucherDate: voucher_date || new Date().toISOString().split('T')[0],
      createdBy: created_by,
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };

    await db.insert(employeeVouchers).values(newVoucher);

    const pgPayload = mapLocalToCloud('employee_vouchers', newVoucher);
    await db.insert(syncQueue).values({
      tableName: 'employee_vouchers',
      action: 'INSERT',
      recordId: id,
      payload: JSON.stringify(pgPayload)
    });

    res.json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE vouchers
router.delete("/vouchers/:id", async (req, res) => {
  const { id } = req.params;

  if (useSupabase(req)) {
    const { data: voucher, error: findError } = await supabase
      .from('employee_vouchers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError || !voucher) {
      return res.status(404).json({ error: "Vale não encontrado." });
    }

    const { error: deleteError } = await supabase
      .from('employee_vouchers')
      .delete()
      .eq('id', id);

    if (deleteError) return res.status(400).json({ error: deleteError.message });
    return res.json({ success: true, message: "Vale excluído com sucesso." });
  }

  // SQLite fallback
  try {
    const [oldVoucher] = await db.select().from(employeeVouchers).where(eq(employeeVouchers.id, id)).limit(1);
    if (!oldVoucher) return res.status(404).json({ error: "Vale não encontrado." });

    await db.delete(employeeVouchers).where(eq(employeeVouchers.id, id));

    await db.insert(syncQueue).values({
      tableName: 'employee_vouchers',
      action: 'DELETE',
      recordId: id,
      payload: JSON.stringify({ id })
    });

    res.json({ success: true, message: "Vale excluído com sucesso." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
