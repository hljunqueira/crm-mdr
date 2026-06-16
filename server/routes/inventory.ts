import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get all inventory (devices)
router.get("/", async (req, res) => {
  const { unit_id } = req.query;
  let query = supabase.from('devices').select('*, stores(name)');
  
  if (unit_id && unit_id !== 'all') {
    query = query.eq('store_id', unit_id);
  }
  
  const { data, error } = await query.order('model');
  
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
  const { user_id, ...updatePayload } = req.body;

  // Fields we want to check
  const hasQuantityChange = updatePayload.stock_quantity !== undefined;
  const hasCostPriceChange = updatePayload.cost_price !== undefined;
  const hasSalePriceChange = updatePayload.sale_price !== undefined;
  const hasTradeInPriceChange = updatePayload.trade_in_price !== undefined;

  if (hasQuantityChange || hasCostPriceChange || hasSalePriceChange || hasTradeInPriceChange) {
    if (!user_id) {
      return res.status(403).json({ error: "Identificação do usuário é necessária para alterar estoque ou preços." });
    }

    // Get current item in DB
    const { data: currentItem, error: fetchError } = await supabase
      .from('devices')
      .select('stock_quantity, cost_price, sale_price, trade_in_price')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !currentItem) {
      return res.status(404).json({ error: "Dispositivo não encontrado no estoque." });
    }

    // Get user role
    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single();

    if (profError || !profile) {
      return res.status(403).json({ error: "Perfil do usuário não encontrado." });
    }

    if (profile.role !== 'admin') {
      // Check for price changes
      const isPriceModified = 
        (hasCostPriceChange && Number(updatePayload.cost_price) !== Number(currentItem.cost_price)) ||
        (hasSalePriceChange && Number(updatePayload.sale_price) !== Number(currentItem.sale_price)) ||
        (hasTradeInPriceChange && Number(updatePayload.trade_in_price) !== Number(currentItem.trade_in_price));

      // Check for stock increase
      const isStockIncreased =
        hasQuantityChange && Number(updatePayload.stock_quantity) > Number(currentItem.stock_quantity);

      if (isPriceModified || isStockIncreased) {
        return res.status(403).json({ error: "Apenas administradores podem reajustar preços, custos ou aumentar a quantidade de estoque." });
      }
    }
  }

  const { data, error } = await supabase
    .from('devices')
    .update(updatePayload)
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
