import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get all invoices (optionally filtered by store_id)
router.get("/", async (req, res) => {
  const { store_id } = req.query;
  
  let query = supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (store_id) {
    query = query.eq('store_id', store_id);
  }

  const { data, error } = await query;
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// Create new invoice
router.post("/", async (req, res) => {
  const { data, error } = await supabase
    .from('invoices')
    .insert([req.body])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update invoice
router.patch("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from('invoices')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// Get store fiscal config
router.get("/config/:storeId", async (req, res) => {
  const { data, error } = await supabase
    .from('stores')
    .select('cnpj, fiscal_api_token, fiscal_environment, fiscal_gateway')
    .eq('id', req.params.storeId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Configuração não encontrada para a unidade" });
  }
  res.json(data);
});

// Save store fiscal config
router.post("/config/:storeId", async (req, res) => {
  const { cnpj, fiscal_api_token, fiscal_environment, fiscal_gateway } = req.body;
  
  const { data, error } = await supabase
    .from('stores')
    .update({
      cnpj,
      fiscal_api_token,
      fiscal_environment,
      fiscal_gateway
    })
    .eq('id', req.params.storeId)
    .select('cnpj, fiscal_api_token, fiscal_environment, fiscal_gateway')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
