import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get unit by ID
router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', req.params.id)
    .single();
  
  if (error || !data) {
    return res.json({ id: req.params.id, name: "MDR Informática & Celulares" });
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
