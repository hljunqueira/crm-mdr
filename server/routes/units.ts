import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get all units
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('name');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// Get unit by ID
router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', req.params.id)
    .single();
  
  if (error || !data) {
    return res.status(404).json({ error: "Unidade não encontrada" });
  }
  res.json(data);
});

// Update unit
router.patch("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from('stores')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

export default router;
