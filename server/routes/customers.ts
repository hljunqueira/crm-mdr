import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get all customers
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create customer
router.post("/", async (req, res) => {
  const { data, error } = await supabase
    .from('customers')
    .insert([req.body])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update customer
router.patch("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from('customers')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// Delete customer
router.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
