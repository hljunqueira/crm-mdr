import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get all sales
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from('sales')
    .select('*, customers(name), profiles(full_name)')
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create sale
router.post("/", async (req, res) => {
  const { data, error } = await supabase
    .from('sales')
    .insert([req.body])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update sale
router.patch("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from('sales')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// Delete sale
router.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
