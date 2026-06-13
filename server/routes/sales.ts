import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get all sales
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from('sales')
    .select('*, customers(name), profiles(full_name)')
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create sale
router.post("/", async (req, res) => {
  const { data, error } = await supabase
    .from('sales')
    .insert([req.body])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update sale
router.patch("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from('sales')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// Delete sale
router.delete("/:id", async (req, res) => {
  try {
    // 1. Fetch the sale details first to get the IMEIs and accessories
    const { data: sale, error: fetchError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !sale) {
      return res.status(404).json({ error: "Venda não encontrada" });
    }

    // 2. Restore stock for main devices
    if (sale.device_id) {
      const { data: device } = await supabase
        .from('devices')
        .select('stock_quantity')
        .eq('id', sale.device_id)
        .single();

      if (device) {
        const newQty = (device.stock_quantity || 0) + 1;
        await supabase
          .from('devices')
          .update({ stock_quantity: newQty, status: 'available' })
          .eq('id', sale.device_id);
      }
    } else if (sale.imei_manual && sale.imei_manual !== 'N/A') {
      const imeis = sale.imei_manual.split(',').map((i: string) => i.trim()).filter(Boolean);
      for (const imei of imeis) {
        if (imei !== 'N/A') {
          // Fetch current stock to calculate new value
          const { data: device } = await supabase
            .from('devices')
            .select('id, stock_quantity')
            .eq('imei', imei)
            .single();

          if (device) {
            const newQty = (device.stock_quantity || 0) + 1;
            await supabase
              .from('devices')
              .update({ stock_quantity: newQty, status: 'available' })
              .eq('id', device.id);
          }
        }
      }
    } else if (sale.device_model_manual) {
      const { data: devices } = await supabase
        .from('devices')
        .select('id, stock_quantity')
        .eq('model', sale.device_model_manual)
        .eq('store_id', sale.store_id)
        .limit(1);

      if (devices && devices.length > 0) {
        const device = devices[0];
        const newQty = (device.stock_quantity || 0) + 1;
        await supabase
          .from('devices')
          .update({ stock_quantity: newQty, status: 'available' })
          .eq('id', device.id);
      }
    }

    // 3. Restore stock for accessories (using accessories string)
    if (sale.accessories) {
      // Split by '|' first to separate accessories from metadata
      const parts = sale.accessories.split('|');
      const accessoriesPart = parts[0] || '';

      // Split individual accessories by comma
      const accList = accessoriesPart.split(',').map((a: string) => a.trim()).filter(Boolean);
      for (const acc of accList) {
        // Remove trailing details in parentheses like "(Brinde)" or "(Venda R$99.00)"
        const cleanName = acc.replace(/\s*\([^)]*\)\s*/g, '').trim();
        if (cleanName) {
          // Find the device/accessory by model name
          const { data: device } = await supabase
            .from('devices')
            .select('id, stock_quantity')
            .eq('model', cleanName)
            .limit(1);

          if (device && device.length > 0) {
            const targetDevice = device[0];
            const newQty = (targetDevice.stock_quantity || 0) + 1;
            await supabase
              .from('devices')
              .update({ stock_quantity: newQty, status: 'available' })
              .eq('id', targetDevice.id);
          }
        }
      }
    }

    // 4. Finally delete the sale (which cascades to delete installments)
    const { error: deleteError } = await supabase
      .from('sales')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    res.status(204).send();
  } catch (err: any) {
    console.error('Error deleting sale and restoring inventory:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
