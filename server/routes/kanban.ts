import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get columns
router.get("/columns", async (req, res) => {
  const { data, error } = await supabase
    .from('kanban_columns')
    .select('*')
    .order('order_index');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get cards (deals)
router.get("/cards", async (req, res) => {
  const { data, error } = await supabase
    .from('deals')
    .select('*, customers(name), profiles(full_name)')
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create card (deal)
router.post("/cards", async (req, res) => {
  const { data, error } = await supabase
    .from('deals')
    .insert([req.body])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update card (deal)
router.patch("/cards/:id", async (req, res) => {
  const { data, error } = await supabase
    .from('deals')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// Delete card (deal)
router.delete("/cards/:id", async (req, res) => {
  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
