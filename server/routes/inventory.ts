import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get all inventory (devices)
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from('devices')
    .select('*, stores(name)')
    .order('model');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create item
router.post("/", async (req, res) => {
  const { data, error } = await supabase
    .from('devices')
    .insert([req.body])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update item
router.patch("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from('devices')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// Delete item
router.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from('devices')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
