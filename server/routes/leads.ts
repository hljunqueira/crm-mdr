import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get all leads
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create lead
router.post("/", async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .insert([req.body])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update lead
router.patch("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// Delete lead
router.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
