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

// Get import batches summary
router.get("/batches", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select('import_batch_id, model, short_name, description, purchase_date')
      .not('import_batch_id', 'is', null);

    if (error) throw error;

    const batchesMap: Record<string, { count: number; date: string; sampleName: string }> = {};

    (data || []).forEach(item => {
      const batchId = item.import_batch_id;
      if (!batchId) return;

      if (batchesMap[batchId]) {
        batchesMap[batchId].count += 1;
      } else {
        let dateStr = 'Data recente';
        const parts = batchId.split('_');
        if (parts[1] && !isNaN(Number(parts[1]))) {
          dateStr = new Date(Number(parts[1])).toLocaleString('pt-BR');
        } else if (item.purchase_date) {
          dateStr = new Date(item.purchase_date).toLocaleDateString('pt-BR');
        }

        batchesMap[batchId] = {
          count: 1,
          date: dateStr,
          sampleName: item.short_name || item.model || item.description || 'Produto'
        };
      }
    });

    const batches = Object.entries(batchesMap).map(([id, info]) => ({
      id,
      ...info
    }));

    res.json(batches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete import batch
router.delete("/batch/:batchId", async (req, res) => {
  const { batchId } = req.params;
  try {
    const { data: devices, error: fetchErr } = await supabase
      .from('devices')
      .select('id')
      .eq('import_batch_id', batchId);

    if (fetchErr) throw fetchErr;

    if (!devices || devices.length === 0) {
      return res.status(404).json({ error: "Nenhum produto localizado para este lote de importação." });
    }

    const deviceIds = devices.map(d => d.id);

    // 1. Unlink inventory_logs
    await supabase
      .from('inventory_logs')
      .update({ device_id: null })
      .in('device_id', deviceIds);

    // 2. Delete device_locks
    await supabase
      .from('device_locks')
      .delete()
      .in('device_id', deviceIds);

    // 3. Delete from devices
    const { error: delErr } = await supabase
      .from('devices')
      .delete()
      .in('id', deviceIds);

    if (delErr) throw delErr;

    res.json({ success: true, count: deviceIds.length, message: `${deviceIds.length} produtos da importação foram removidos com sucesso.` });
  } catch (err: any) {
    console.error("[Inventory Batch Delete] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete item (ou zerar estoque se possuir histórico/venda vinculada)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Limpar referências em logs e locks
    await supabase
      .from('inventory_logs')
      .update({ device_id: null })
      .eq('device_id', id);

    await supabase
      .from('device_locks')
      .delete()
      .eq('device_id', id);

    // 2. Tentar exclusão direta
    let { error: deleteError } = await supabase
      .from('devices')
      .delete()
      .eq('id', id);

    // 3. Se falhar devido a restrição de chave estrangeira (FK)
    if (deleteError) {
      console.warn('[Inventory Delete] Possui histórico/vínculo associado. Verificando vendas:', deleteError.message);

      // Verificar se o aparelho realmente possui uma venda associada
      const { data: salesLink } = await supabase
        .from('sales')
        .select('id')
        .eq('device_id', id)
        .neq('status', 'cancelled');

      const hasActiveSale = salesLink && salesLink.length > 0;

      if (hasActiveSale) {
        // Se possui venda ativa real, marcar como VENDIDO com estoque 0
        await supabase
          .from('devices')
          .update({ stock_quantity: 0, status: 'sold' })
          .eq('id', id);
      } else {
        // Se NÃO possui venda ativa, desvincular investidor e lote e tentar excluir novamente
        await supabase
          .from('devices')
          .update({ investor_id: null, lot_id: null })
          .eq('id', id);

        const { error: retryDeleteErr } = await supabase
          .from('devices')
          .delete()
          .eq('id', id);

        if (retryDeleteErr) {
          // Se ainda não for possível excluir (ex: vinculado a Ordem de Serviço), marcar como inativo sem falsamente marcar como vendido
          await supabase
            .from('devices')
            .update({ stock_quantity: 0, status: 'inactive' })
            .eq('id', id);
        }
      }
    }

    res.status(204).send();
  } catch (err: any) {
    console.error("[Inventory Delete] Error:", err);
    res.status(500).json({ error: err.message || 'Erro ao remover item do estoque.' });
  }
});

export default router;
