import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get all suppliers
router.get("/", async (req, res) => {
  const { unit_id, all } = req.query;
  
  let query = supabase.from('suppliers').select('*');
  
  if (all !== 'true') {
    query = query.eq('active', true);
  }

  if (unit_id && unit_id !== 'all') {
    query = query.or(`unit_id.eq.${unit_id},unit_id.is.null`);
  }
  
  const { data, error } = await query.order('name');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// Create supplier
router.post("/", async (req, res) => {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([req.body])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update supplier
router.patch("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from('suppliers')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// Delete supplier
router.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
