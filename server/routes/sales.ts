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
  const { store_id, seller_id, is_trade_in, trade_in_device_imei, trade_in_device_brand, trade_in_device_model, trade_in_valuation, trade_in_sale_price_estimate } = req.body;
  if (!store_id) {
    return res.status(400).json({ error: "O campo store_id (unidade) é obrigatório." });
  }

  // Check if cashier shift is open for this unit
  const { data: activeShift, error: shiftError } = await supabase
    .from('cash_shifts')
    .select('id')
    .eq('unit_id', store_id)
    .eq('status', 'open')
    .maybeSingle();

  if (shiftError) {
    return res.status(500).json({ error: shiftError.message });
  }

  if (!activeShift) {
    return res.status(400).json({ error: "Não existe um caixa aberto para esta unidade. Abra o caixa antes de realizar vendas." });
  }

  try {
    // 1. If it's a trade-in, handle IMEI unique constraint release
    if (is_trade_in && trade_in_device_imei) {
      const cleanImei = String(trade_in_device_imei).trim();
      const { data: existingDevice } = await supabase
        .from('devices')
        .select('id, status, imei')
        .eq('imei', cleanImei)
        .maybeSingle();

      if (existingDevice && existingDevice.status === 'sold') {
        // Rename the old IMEI to release unique constraint
        await supabase
          .from('devices')
          .update({ imei: `${cleanImei}_sold` })
          .eq('id', existingDevice.id);
      }
    }

    // 2. Insert Sale
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([req.body])
      .select()
      .single();

    if (saleError) return res.status(500).json({ error: saleError.message });

    // 3. If it's a trade-in, insert the traded phone into devices (inventory)
    if (is_trade_in) {
      const priceEstimate = Number(trade_in_sale_price_estimate) || 0;
      const initialStatus = priceEstimate > 0 ? 'available' : 'pending_valuation';

      const { error: deviceError } = await supabase
        .from('devices')
        .insert({
          store_id: store_id,
          brand: trade_in_device_brand,
          model: trade_in_device_model,
          imei: trade_in_device_imei ? String(trade_in_device_imei).trim() : null,
          condition: 'used',
          cost_price: Number(trade_in_valuation) || 0,
          sale_price: priceEstimate,
          stock_quantity: 1,
          status: initialStatus,
          notes: `Aparelho recebido como troca na venda ID: ${saleData.id}`
        });

      if (deviceError) {
        console.error("Erro ao cadastrar aparelho de troca no estoque:", deviceError);
      }

      if (initialStatus === 'pending_valuation') {
        let storeName = 'MDR';
        let sellerName = 'Vendedor';
        try {
          if (store_id) {
            const { data: storeData } = await supabase.from('stores').select('name').eq('id', store_id).single();
            if (storeData) {
              storeName = storeData.name;
            }
          }
          if (seller_id) {
            const { data: sellerData } = await supabase.from('profiles').select('full_name').eq('id', seller_id).single();
            if (sellerData) {
              sellerName = sellerData.full_name;
            }
          }
        } catch (e) {
          console.error('Error fetching names for notification:', e);
        }

        const messageText = `📱 *Alerta de Nova Troca Pendente* 📱\n\n` +
          `Uma nova troca foi registrada e está aguardando avaliação:\n\n` +
          `*Loja:* ${storeName}\n` +
          `*Aparelho:* ${trade_in_device_brand} ${trade_in_device_model}\n` +
          `*IMEI:* ${trade_in_device_imei || 'N/A'}\n` +
          `*Valor de Abatimento:* R$ ${(Number(trade_in_valuation) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
          `*Vendedor:* ${sellerName}\n\n` +
          `Por favor, acesse o painel de estoque para definir o preço de revenda e ativar o aparelho.`;

        try {
          const { data: storeData } = await supabase.from('stores').select('instance').eq('id', store_id).single();
          const instance = storeData?.instance || 'MDR';

          const n8nWebhookUrl = 'https://n8n.mdrinformaticaecelulares.com.br/webhook/trade-in-alert';
          const payload = {
            adminPhone: "554899035854",
            text: messageText,
            instance: instance
          };

          const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            const errText = await response.text();
            console.warn('Failed to notify trade-in via n8n, falling back to direct chat send:', errText);
            const fallbackUrl = `${req.protocol}://${req.get('host')}/api/chat/send`;
            await fetch(fallbackUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                instanceName: instance,
                remoteJid: "554899035854",
                text: messageText
              })
            });
          }
        } catch (notifErr) {
          console.error('Error sending trade-in notification:', notifErr);
        }
      }
    }

    res.status(201).json(saleData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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

    // 4. If it was a trade-in, clean up the received device in stock precisely
    if (sale.is_trade_in) {
      await supabase
        .from('devices')
        .delete()
        .eq('notes', `Aparelho recebido como troca na venda ID: ${sale.id}`);
    }

    // 5. Finally delete the sale (which cascades to delete installments)
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
