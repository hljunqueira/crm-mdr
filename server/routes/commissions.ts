import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// GET /api/commissions/settings - Obter configurações de comissão de todos os perfis
router.get("/settings", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('commission_settings')
      .select('*, profiles(id, full_name, role)');

    if (error) return res.status(400).json({ error: error.message });
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/commissions/settings - Upsert configurações de comissão
router.post("/settings", async (req, res) => {
  try {
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
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/commissions/vouchers - Obter vales de funcionários
router.get("/vouchers", async (req, res) => {
  try {
    const { unit_id, profile_id, start_date, end_date } = req.query;
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
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/commissions/vouchers - Registrar um vale (com integração opcional ao caixa físico)
router.post("/vouchers", async (req, res) => {
  try {
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

    let activeShiftId = null;
    let activeShift: any = null;

    // Se o pagamento for em dinheiro físico (caixa)
    if (payment_method === 'money') {
      // 1. Verificar se o turno de caixa está aberto para esta unidade
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

      // 2. Opcional: Validar se há saldo suficiente na gaveta
      const currentCashInDrawer = Number(activeShift.expected_cash || 0);
      if (currentCashInDrawer < parseFloat(amount)) {
        return res.status(400).json({ error: `Saldo físico em dinheiro insuficiente na gaveta. Saldo atual: R$ ${currentCashInDrawer.toFixed(2)}.` });
      }

      activeShiftId = activeShift.id;
    }

    // 3. Inserir o vale/adiantamento
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

    // 4. Se for em dinheiro, integrar com o caixa (lançar outflow/saída)
    if (payment_method === 'money' && activeShiftId) {
      const typeLabel = type === 'pro_labore' ? 'Retirada Pró-labore' : type === 'profit_distribution' ? 'Retirada de Lucros' : 'Vale Funcionário';
      
      const { data: employee } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', profile_id)
        .maybeSingle();

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
        // Rollback do vale se falhar ao inserir no caixa
        await supabase.from('employee_vouchers').delete().eq('id', voucher.id);
        return res.status(400).json({ error: `Falha ao integrar com o caixa: ${txError.message}` });
      }

      // 5. Atualizar saldo esperado de dinheiro no turno de caixa
      const newExpectedCash = Number(activeShift.expected_cash || 0) - parseFloat(amount);
      const { error: shiftUpdateError } = await supabase
        .from('cash_shifts')
        .update({
          expected_cash: newExpectedCash
        })
        .eq('id', activeShiftId);
    }

    res.json(voucher);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/commissions/vouchers/:id - Excluir um vale (o cascade remove a transação do caixa)
router.delete("/vouchers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar informações do vale antes de deletar
    const { data: voucher, error: findError } = await supabase
      .from('employee_vouchers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError || !voucher) {
      return res.status(404).json({ error: "Vale não encontrado." });
    }

    // Excluir o vale (deve deletar cash_transactions em cascata pelo trigger do banco)
    const { error: deleteError } = await supabase
      .from('employee_vouchers')
      .delete()
      .eq('id', id);

    if (deleteError) return res.status(400).json({ error: deleteError.message });
    res.json({ success: true, message: "Vale excluído com sucesso." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
