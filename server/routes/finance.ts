import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get all installments
router.get("/installments", async (req, res) => {
  const { data, error } = await supabase
    .from('installments')
    .select('*, sales(*, customers(name))')
    .order('due_date', { ascending: true });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create installments
router.post("/installments", async (req, res) => {
  const installments = Array.isArray(req.body) ? req.body : [req.body];
  const { data, error } = await supabase
    .from('installments')
    .insert(installments)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update installment
router.patch("/installments/:id", async (req, res) => {
  const { data, error } = await supabase
    .from('installments')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

export default router;
