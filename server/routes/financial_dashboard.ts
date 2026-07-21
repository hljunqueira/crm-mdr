import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// GET /bills - List credit card bills for a specific month and year
router.get("/bills", async (req, res) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const unitId = req.query.unit_id as string;

    let query = supabase.from("credit_card_bills").select("*");
    if (unitId && unitId !== "all") {
      query = query.eq("unit_id", unitId);
    }

    const { data: bills, error: billsError } = await query;
    if (billsError) throw billsError;

    const billIds = bills.map(b => b.id);

    // Fetch all payments for these bills to calculate remaining installments accurately
    let allPayments: any[] = [];
    if (billIds.length > 0) {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("credit_card_bill_payments")
        .select("bill_id, month, year")
        .in("bill_id", billIds);
      if (paymentsError) throw paymentsError;
      allPayments = paymentsData || [];
    }

    const activeBills = [];
    for (const bill of bills) {
      const elapsedMonths = (year - bill.start_year) * 12 + (month - bill.start_month);
      const currentInstallment = elapsedMonths + 1;
      
      const paymentsForBill = allPayments.filter(p => p.bill_id === bill.id);
      const isPaid = paymentsForBill.some(p => p.month === month && p.year === year);
      const remainingInstallments = Math.max(0, bill.total_installments - paymentsForBill.length);

      // A bill is active in the selected month if:
      // 1. It is within its scheduled timeline
      // 2. OR its schedule has elapsed but it still has outstanding debt (unpaid installments)
      const isWithinTimeline = currentInstallment >= 1 && currentInstallment <= bill.total_installments;
      const hasPendingDebt = currentInstallment > bill.total_installments && remainingInstallments > 0;

      if (isWithinTimeline || hasPendingDebt) {
        activeBills.push({
          ...bill,
          current_installment: Math.min(bill.total_installments, Math.max(1, currentInstallment)),
          remaining_installments: remainingInstallments,
          is_active: true,
          is_paid: isPaid
        });
      }
    }

    res.json(activeBills);
  } catch (error: any) {
    console.error("[Financial Dashboard] Error getting bills:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /bills - Create new credit card bill
router.post("/bills", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("credit_card_bills")
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error("[Financial Dashboard] Error creating bill:", error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /bills/:id - Update credit card bill
router.patch("/bills/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("credit_card_bills")
      .update(req.body)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("[Financial Dashboard] Error updating bill:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /bills/:id - Delete credit card bill
router.delete("/bills/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from("credit_card_bills")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;
    res.json({ success: true, message: "Conta excluída com sucesso." });
  } catch (error: any) {
    console.error("[Financial Dashboard] Error deleting bill:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /bills/:id/pay - Toggle bill payment status for a specific month/year
router.post("/bills/:id/pay", async (req, res) => {
  try {
    const { month, year, pay } = req.body;
    const billId = req.params.id;

    if (pay) {
      const { data, error } = await supabase
        .from("credit_card_bill_payments")
        .upsert({ bill_id: billId, month, year }, { onConflict: "bill_id,month,year" })
        .select()
        .single();
      if (error) throw error;
      res.json({ paid: true, data });
    } else {
      const { error } = await supabase
        .from("credit_card_bill_payments")
        .delete()
        .eq("bill_id", billId)
        .eq("month", month)
        .eq("year", year);
      if (error) throw error;
      res.json({ paid: false });
    }
  } catch (error: any) {
    console.error("[Financial Dashboard] Error toggling bill payment:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /forecasts - Get financial forecasts with fallback to the last month with data
router.get("/forecasts", async (req, res) => {
  try {
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const { data: forecast, error } = await supabase
      .from("monthly_financial_forecasts")
      .select("*")
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();

    if (error) throw error;

    if (forecast) {
      return res.json(forecast);
    }

    // Fallback: search for latest month/year with data
    const { data: fallback, error: fbError } = await supabase
      .from("monthly_financial_forecasts")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1);

    if (fbError) throw fbError;

    if (fallback && fallback.length > 0) {
      // Return fallback data but keep the current month/year fields for context
      return res.json({
        ...fallback[0],
        id: undefined, // Don't return the ID of the fallback so frontend knows it's not saved for the current month yet
        month,
        year
      });
    }

    // Default template if absolutely no data exists in table
    res.json({
      month,
      year,
      store_1_forecast: 0.0,
      store_2_forecast: 0.0,
      fixed_store_expenses: 0.0,
      fixed_personal_expenses: 0.0,
      card_payments_inflow: 0.0
    });
  } catch (error: any) {
    console.error("[Financial Dashboard] Error getting forecasts:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /forecasts - Upsert forecast settings for a month/year
router.post("/forecasts", async (req, res) => {
  try {
    const { month, year, store_1_forecast, store_2_forecast, fixed_store_expenses, fixed_personal_expenses, card_payments_inflow } = req.body;

    const { data, error } = await supabase
      .from("monthly_financial_forecasts")
      .upsert(
        {
          month,
          year,
          store_1_forecast: store_1_forecast || 0.0,
          store_2_forecast: store_2_forecast || 0.0,
          fixed_store_expenses: fixed_store_expenses || 0.0,
          fixed_personal_expenses: fixed_personal_expenses || 0.0,
          card_payments_inflow: card_payments_inflow || 0.0,
          updated_at: new Date().toISOString()
        },
        { onConflict: "month,year" }
      )
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("[Financial Dashboard] Error upserting forecast:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /bills/monthly-report - Relatório mensal de cartões (últimos 6 meses, mês atual, próximos 5 meses)
router.get("/bills/monthly-report", async (req, res) => {
  try {
    const currentMonth = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const currentYear = parseInt(req.query.year as string) || new Date().getFullYear();
    const unitId = req.query.unit_id as string;

    // Fetch all credit card bills for the unit
    let query = supabase.from("credit_card_bills").select("*");
    if (unitId && unitId !== "all") {
      query = query.eq("unit_id", unitId);
    }
    const { data: bills, error: billsError } = await query;
    if (billsError) throw billsError;

    // Fetch all payments
    const billIds = bills.map(b => b.id);
    let allPayments: any[] = [];
    if (billIds.length > 0) {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("credit_card_bill_payments")
        .select("bill_id, month, year")
        .in("bill_id", billIds);
      if (paymentsError) throw paymentsError;
      allPayments = paymentsData || [];
    }

    // Build the 12 months range (starting from 6 months ago)
    const report = [];
    const baseDate = new Date(currentYear, currentMonth - 1, 1);

    for (let i = -6; i <= 5; i++) {
      const d = new Date(baseDate);
      d.setMonth(baseDate.getMonth() + i);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();

      let fixedValue = 0;
      let paidValue = 0;

      for (const bill of bills) {
        const elapsedMonths = (y - bill.start_year) * 12 + (m - bill.start_month);
        const installmentNum = elapsedMonths + 1;

        // Calculate total payments for this bill up to the CURRENT projected month 'm' / 'y'
        const paymentsUpToThisMonth = allPayments.filter(p => p.bill_id === bill.id && (p.year < y || (p.year === y && p.month <= m)));
        const remainingInstallments = Math.max(0, bill.total_installments - paymentsUpToThisMonth.length);

        const isWithinTimeline = installmentNum >= 1 && installmentNum <= bill.total_installments;
        const hasPendingDebt = installmentNum > bill.total_installments && remainingInstallments > 0;

        if (isWithinTimeline || hasPendingDebt) {
          fixedValue += Number(bill.value);
          const isPaidInThisMonth = allPayments.some(p => p.bill_id === bill.id && p.month === m && p.year === y);
          if (isPaidInThisMonth) {
            paidValue += Number(bill.value);
          }
        }
      }

      report.push({
        month: m,
        year: y,
        monthLabel: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase().replace('.', ''),
        fixedValue: Number(fixedValue.toFixed(2)),
        paidValue: Number(paidValue.toFixed(2)),
        remainingValue: Number(Math.max(0, fixedValue - paidValue).toFixed(2))
      });
    }

    res.json(report);
  } catch (error: any) {
    console.error("[Financial Dashboard] Error getting monthly bills report:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

