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

    // Fetch payments for this month/year
    const { data: payments, error: paymentsError } = await supabase
      .from("credit_card_bill_payments")
      .select("bill_id")
      .eq("month", month)
      .eq("year", year);
    if (paymentsError) throw paymentsError;

    const paidBillIds = new Set(payments?.map(p => p.bill_id) || []);

    const activeBills = bills
      .map(bill => {
        const elapsedMonths = (year - bill.start_year) * 12 + (month - bill.start_month);
        const currentInstallment = elapsedMonths + 1;
        const remainingInstallments = bill.total_installments - currentInstallment;

        // Is it active in the selected month/year?
        const isActive = currentInstallment >= 1 && currentInstallment <= bill.total_installments;

        return {
          ...bill,
          current_installment: currentInstallment,
          remaining_installments: remainingInstallments,
          is_active: isActive,
          is_paid: paidBillIds.has(bill.id)
        };
      })
      .filter(bill => bill.is_active);

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

export default router;
