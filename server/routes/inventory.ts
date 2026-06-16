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
  const { user_id, is_manual, admin_password, ...updatePayload } = req.body;

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

      if (isPriceModified) {
        return res.status(403).json({ error: "Apenas administradores podem reajustar preços e custos." });
      }

      // Check for stock quantity change
      if (hasQuantityChange) {
        const newQty = Number(updatePayload.stock_quantity);
        const oldQty = Number(currentItem.stock_quantity);

        if (newQty < oldQty && is_manual) {
          // It's a manual decrease! Require admin password
          if (!admin_password) {
            return res.status(403).json({ error: "A senha do administrador é necessária para diminuir a quantidade em estoque." });
          }

          // Verify admin password
          // 1. Fetch all admins
          const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin');

          let passwordValid = false;
          if (admins && admins.length > 0) {
            const { createClient } = await import('@supabase/supabase-js');
            for (const admin of admins) {
              const { data: userObj } = await supabase.auth.admin.getUserById(admin.id);
              if (userObj && userObj.user?.email) {
                const email = userObj.user.email;
                const tempClient = createClient(
                  process.env.VITE_SUPABASE_URL || '',
                  process.env.VITE_SUPABASE_ANON_KEY || ''
                );

                const { error: authError } = await tempClient.auth.signInWithPassword({
                  email,
                  password: admin_password
                });

                if (!authError) {
                  passwordValid = true;
                  break;
                }
              }
            }
          }

          if (!passwordValid) {
            return res.status(401).json({ error: "Senha do administrador incorreta." });
          }
        }
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
