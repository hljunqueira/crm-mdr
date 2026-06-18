import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { deleteAsaasPayment } from "../services/asaasService.js";

const router = Router();

const validSalesColumns = [
  'store_id', 'customer_id', 'seller_id', 'device_id', 'device_model_manual', 
  'imei_manual', 'total_value', 'down_payment', 'installments_count', 
  'service_fee', 'original_price', 'sale_date', 'status', 'payment_type', 
  'accessories', 'is_trade_in', 'trade_in_device_brand', 'trade_in_device_model', 
  'trade_in_device_imei', 'trade_in_valuation', 'trade_in_sale_price_estimate',
  'payment_method'
];

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
  const { data: activeShiftData, error: shiftError } = await supabase
    .from('cash_shifts')
    .select('*')
    .eq('unit_id', store_id)
    .eq('status', 'open')
    .maybeSingle();

  if (shiftError) {
    return res.status(500).json({ error: shiftError.message });
  }

  const activeShift = activeShiftData as any;
  if (!activeShift && req.body.status !== 'waiting_pickup') {
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

    const cleanSaleBody = {};
    validSalesColumns.forEach(col => {
      if (req.body[col] !== undefined) {
        cleanSaleBody[col] = req.body[col];
      }
    });

    // 2. Insert Sale
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([cleanSaleBody])
      .select()
      .single();

    if (saleError) return res.status(500).json({ error: saleError.message });

    // 2.5 Integrate with Cash Flow
    if (activeShift && saleData.status !== 'waiting_pickup') {
      const isCashLike = saleData.payment_type === 'vista' || saleData.payment_type === 'debit';
      const paymentMethod = saleData.payment_type === 'debit' ? 'card' : (req.body.payment_method || 'money');
      const isCash = paymentMethod === 'money';
      const isDigital = paymentMethod === 'pix' || paymentMethod === 'card' || paymentMethod === 'bank';

      if (isCashLike) {
        const desc = saleData.payment_type === 'debit' 
          ? `Venda no cartão de débito: ${saleData.device_model_manual || 'Aparelho'}` 
          : `Venda à vista: ${saleData.device_model_manual || 'Aparelho'}`;

        await supabase.from('cash_transactions').insert({
          unit_id: store_id,
          shift_id: activeShift.id,
          type: 'inflow',
          category: 'sale',
          amount: Number(saleData.total_value),
          payment_method: paymentMethod,
          description: desc,
          sale_id: saleData.id,
          created_by: seller_id || activeShift.opened_by
        });

        // Update shift expected balances
        const updatePayload: any = {};
        if (isCash) {
          updatePayload.expected_cash = Number(activeShift.expected_cash || 0) + Number(saleData.total_value);
        } else if (isDigital) {
          updatePayload.expected_digital = Number(activeShift.expected_digital || 0) + Number(saleData.total_value);
        }
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('cash_shifts').update(updatePayload).eq('id', activeShift.id);
        }
      } else if (Number(saleData.down_payment) > 0 && req.body.payment_method !== 'trade') {
        const desc = `Entrada da venda: ${saleData.device_model_manual || 'Aparelho'}`;

        await supabase.from('cash_transactions').insert({
          unit_id: store_id,
          shift_id: activeShift.id,
          type: 'inflow',
          category: 'sale',
          amount: Number(saleData.down_payment),
          payment_method: paymentMethod,
          description: desc,
          sale_id: saleData.id,
          created_by: seller_id || activeShift.opened_by
        });

        // Update shift expected balances
        const updatePayload: any = {};
        if (isCash) {
          updatePayload.expected_cash = Number(activeShift.expected_cash || 0) + Number(saleData.down_payment);
        } else if (isDigital) {
          updatePayload.expected_digital = Number(activeShift.expected_digital || 0) + Number(saleData.down_payment);
        }
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('cash_shifts').update(updatePayload).eq('id', activeShift.id);
        }
      }
    }

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
          const { data: storeData } = await supabase.from('stores').select('evolution_instance').eq('id', store_id).single();
          const instance = storeData?.evolution_instance || 'MDR';

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
  try {
    // 1. Fetch old sale
    const { data: oldSale, error: oldError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', req.params.id)
      .single();
       
    if (oldError || !oldSale) return res.status(404).json({ error: "Venda não encontrada." });
     
    const storeId = req.body.store_id || oldSale.store_id;
     
    // 2. Fetch active shift
    const { data: activeShiftData } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('unit_id', storeId)
      .eq('status', 'open')
      .maybeSingle();
       
    const activeShift = activeShiftData as any;
       
    // 3. Revert old transaction if shift is open
    if (activeShift) {
      const { data: oldTx } = await supabase
        .from('cash_transactions')
        .select('*')
        .eq('sale_id', req.params.id)
        .maybeSingle();
         
      if (oldTx) {
        const isCash = oldTx.payment_method === 'money';
        const isDigital = oldTx.payment_method === 'pix' || oldTx.payment_method === 'card' || oldTx.payment_method === 'bank';
        const updatePayload: any = {};
        if (isCash) {
          updatePayload.expected_cash = Math.max(0, Number(activeShift.expected_cash || 0) - Number(oldTx.amount));
        } else if (isDigital) {
          updatePayload.expected_digital = Math.max(0, Number(activeShift.expected_digital || 0) - Number(oldTx.amount));
        }
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('cash_shifts').update(updatePayload).eq('id', activeShift.id);
          // Refresh activeShift reference balances
          activeShift.expected_cash = updatePayload.expected_cash !== undefined ? updatePayload.expected_cash : activeShift.expected_cash;
          activeShift.expected_digital = updatePayload.expected_digital !== undefined ? updatePayload.expected_digital : activeShift.expected_digital;
        }
         
        // Delete old transaction
        await supabase.from('cash_transactions').delete().eq('id', oldTx.id);
      }
    }
    // 3.5 Check and update inventory stock if devices or accessories changed
    const oldImeis = oldSale.imei_manual ? oldSale.imei_manual.split(',').map((i: string) => i.trim()).filter(Boolean) : [];
    const newImeis = req.body.imei_manual ? req.body.imei_manual.split(',').map((i: string) => i.trim()).filter(Boolean) : [];
    const oldDeviceId = oldSale.device_id;
    const newDeviceId = req.body.device_id;
    
    const devicesChanged = 
      (req.body.imei_manual !== undefined && JSON.stringify(oldImeis) !== JSON.stringify(newImeis)) ||
      (req.body.device_id !== undefined && oldDeviceId !== newDeviceId);

    if (devicesChanged) {
      // Restore old devices stock
      if (oldSale.imei_manual && oldSale.imei_manual !== 'N/A') {
        const imeis = oldSale.imei_manual.split(',').map((i: string) => i.trim()).filter(Boolean);
        for (const imei of imeis) {
          if (imei !== 'N/A') {
            const { data: dev } = await supabase.from('devices').select('id, stock_quantity').eq('imei', imei).single();
            if (dev) {
              const newQty = (dev.stock_quantity || 0) + 1;
              await supabase.from('devices').update({ stock_quantity: newQty, status: 'available' }).eq('id', dev.id);
            }
          }
        }
      } else if (oldSale.device_id) {
        const { data: dev } = await supabase.from('devices').select('id, stock_quantity').eq('id', oldSale.device_id).single();
        if (dev) {
          const newQty = (dev.stock_quantity || 0) + 1;
          await supabase.from('devices').update({ stock_quantity: newQty, status: 'available' }).eq('id', dev.id);
        }
      }

      // Decrement new devices stock
      if (req.body.imei_manual && req.body.imei_manual !== 'N/A') {
        const imeis = req.body.imei_manual.split(',').map((i: string) => i.trim()).filter(Boolean);
        for (const imei of imeis) {
          if (imei !== 'N/A') {
            const { data: dev } = await supabase.from('devices').select('id, stock_quantity').eq('imei', imei).single();
            if (dev) {
              const newQty = Math.max(0, (dev.stock_quantity || 0) - 1);
              await supabase.from('devices').update({ stock_quantity: newQty, status: newQty === 0 ? 'sold' : 'available' }).eq('id', dev.id);
            }
          }
        }
      } else if (req.body.device_id) {
        const { data: dev } = await supabase.from('devices').select('id, stock_quantity').eq('id', req.body.device_id).single();
        if (dev) {
          const newQty = Math.max(0, (dev.stock_quantity || 0) - 1);
          await supabase.from('devices').update({ stock_quantity: newQty, status: newQty === 0 ? 'sold' : 'available' }).eq('id', dev.id);
        }
      }
    }

    // Adjust accessories stock if changed
    const oldAccStr = oldSale.accessories || '';
    const newAccStr = req.body.accessories || '';
    if (req.body.accessories !== undefined && oldAccStr !== newAccStr) {
      // 1. Restore old accessories
      const oldParts = oldAccStr.split('|')[0] || '';
      const oldAccList = oldParts.split(',').map((a: string) => a.trim()).filter(Boolean);
      for (const acc of oldAccList) {
        const cleanName = acc.replace(/\s*\([^)]*\)\s*/g, '').trim();
        if (cleanName) {
          const { data: dev } = await supabase.from('devices').select('id, stock_quantity').eq('model', cleanName).limit(1);
          if (dev && dev.length > 0) {
            const target = dev[0];
            const newQty = (target.stock_quantity || 0) + 1;
            await supabase.from('devices').update({ stock_quantity: newQty, status: 'available' }).eq('id', target.id);
          }
        }
      }

      // 2. Decrement new accessories
      const newParts = newAccStr.split('|')[0] || '';
      const newAccList = newParts.split(',').map((a: string) => a.trim()).filter(Boolean);
      for (const acc of newAccList) {
        const cleanName = acc.replace(/\s*\([^)]*\)\s*/g, '').trim();
        if (cleanName) {
          const { data: dev } = await supabase.from('devices').select('id, stock_quantity').eq('model', cleanName).limit(1);
          if (dev && dev.length > 0) {
            const target = dev[0];
            const newQty = Math.max(0, (target.stock_quantity || 0) - 1);
            await supabase.from('devices').update({ stock_quantity: newQty, status: newQty === 0 ? 'sold' : 'available' }).eq('id', target.id);
          }
        }
      }
    }

    // 4. Update the sale
    const cleanSaleBody: any = {};
    validSalesColumns.forEach(col => {
      if (req.body[col] !== undefined) {
        cleanSaleBody[col] = req.body[col];
      }
    });
     
    const { data: updatedSale, error: updateError } = await supabase
      .from('sales')
      .update(cleanSaleBody)
      .eq('id', req.params.id)
      .select()
      .single();
       
    if (updateError) return res.status(500).json({ error: updateError.message });
     
    // 5. Create new transaction if shift is open and has new payment
    if (activeShift && updatedSale) {
      const isCashLike = updatedSale.payment_type === 'vista' || updatedSale.payment_type === 'debit';
      const finalVal = Number(updatedSale.total_value);
      const downPaymentVal = Number(updatedSale.down_payment);
      const paymentMethod = updatedSale.payment_type === 'debit' ? 'card' : (updatedSale.payment_method || 'money');
       
      if (isCashLike) {
        const isCash = paymentMethod === 'money';
        const isDigital = paymentMethod === 'pix' || paymentMethod === 'card' || paymentMethod === 'bank';
        const desc = updatedSale.payment_type === 'debit' 
          ? `Venda no cartão de débito (Editada): ${updatedSale.device_model_manual || 'Aparelho'}` 
          : `Venda à vista (Editada): ${updatedSale.device_model_manual || 'Aparelho'}`;
         
        await supabase.from('cash_transactions').insert({
          unit_id: storeId,
          shift_id: activeShift.id,
          type: 'inflow',
          category: 'sale',
          amount: finalVal,
          payment_method: paymentMethod,
          description: desc,
          sale_id: updatedSale.id,
          created_by: updatedSale.seller_id || activeShift.opened_by
        });
         
        const updatePayload: any = {};
        if (isCash) {
          updatePayload.expected_cash = Number(activeShift.expected_cash || 0) + finalVal;
        } else if (isDigital) {
          updatePayload.expected_digital = Number(activeShift.expected_digital || 0) + finalVal;
        }
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('cash_shifts').update(updatePayload).eq('id', activeShift.id);
        }
      } else if (downPaymentVal > 0 && updatedSale.payment_method !== 'trade') {
        const isCash = paymentMethod === 'money';
        const isDigital = paymentMethod === 'pix' || paymentMethod === 'card' || paymentMethod === 'bank';
         
        await supabase.from('cash_transactions').insert({
          unit_id: storeId,
          shift_id: activeShift.id,
          type: 'inflow',
          category: 'sale',
          amount: downPaymentVal,
          payment_method: paymentMethod,
          description: `Entrada da venda (Editada): ${updatedSale.device_model_manual || 'Aparelho'}`,
          sale_id: updatedSale.id,
          created_by: updatedSale.seller_id || activeShift.opened_by
        });
         
        const updatePayload: any = {};
        if (isCash) {
          updatePayload.expected_cash = Number(activeShift.expected_cash || 0) + downPaymentVal;
        } else if (isDigital) {
          updatePayload.expected_digital = Number(activeShift.expected_digital || 0) + downPaymentVal;
        }
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('cash_shifts').update(updatePayload).eq('id', activeShift.id);
        }
      }
    }
     
    res.json(updatedSale);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
        .select('id, stock_quantity')
        .eq('id', sale.device_id)
        .maybeSingle();

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
            .maybeSingle();

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

    // 4. Cancel/Delete Asaas payments associated with the installments of this sale
    const { data: saleInstallments } = await supabase
      .from('installments')
      .select('asaas_payment_id')
      .eq('sale_id', req.params.id);

    if (saleInstallments && saleInstallments.length > 0) {
      for (const inst of saleInstallments) {
        if (inst.asaas_payment_id) {
          try {
            await deleteAsaasPayment(inst.asaas_payment_id);
          } catch (e) {
            console.error(`Erro ao remover cobrança ${inst.asaas_payment_id} do Asaas:`, e);
          }
        }
      }
    }

    // 4.1 Clean up the received device in stock precisely
    await supabase
      .from('devices')
      .delete()
      .ilike('notes', `%${sale.id}%`);

    // 4.5 Revert cash transactions associated with this sale
    const { data: transactions } = await supabase
      .from('cash_transactions')
      .select('*')
      .eq('sale_id', req.params.id);
       
    if (transactions && transactions.length > 0) {
      for (const tx of transactions) {
        if (tx.shift_id) {
          const { data: shift } = await supabase
            .from('cash_shifts')
            .select('*')
            .eq('id', tx.shift_id)
            .maybeSingle();
             
          if (shift && shift.status === 'open') {
            const isCash = tx.payment_method === 'money';
            const isDigital = tx.payment_method === 'pix' || tx.payment_method === 'card' || tx.payment_method === 'bank';
            const updatePayload: any = {};
            if (isCash) {
              updatePayload.expected_cash = Math.max(0, Number(shift.expected_cash || 0) - Number(tx.amount));
            } else if (isDigital) {
              updatePayload.expected_digital = Math.max(0, Number(shift.expected_digital || 0) - Number(tx.amount));
            }
            if (Object.keys(updatePayload).length > 0) {
              await supabase.from('cash_shifts').update(updatePayload).eq('id', shift.id);
            }
          }
        }
      }
      
      // Delete transactions
      await supabase.from('cash_transactions').delete().eq('sale_id', req.params.id);
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

// Confirm pickup of a sale
router.patch("/:id/confirm-pickup", async (req, res) => {
  const { payment_method, payment_type } = req.body;
  
  try {
    // 1. Fetch sale
    const { data: saleData, error: fetchError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !saleData) {
      return res.status(404).json({ error: "Venda não encontrada." });
    }

    if (saleData.status !== 'waiting_pickup') {
      return res.status(400).json({ error: "Esta venda não está aguardando retirada." });
    }

    // 2. Check cashier shift
    const { data: activeShiftData, error: shiftError } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('unit_id', saleData.store_id)
      .eq('status', 'open')
      .maybeSingle();

    if (shiftError) return res.status(500).json({ error: shiftError.message });
    const activeShift = activeShiftData as any;
    if (!activeShift) {
      return res.status(400).json({ error: "Não existe um caixa aberto para esta unidade. Abra o caixa antes de confirmar a retirada." });
    }

    // 3. Update sale status and payment details
    const updatedPaymentMethod = payment_method || saleData.payment_method || 'money';
    const updatedPaymentType = payment_type || saleData.payment_type || 'vista';

    const { data: updatedSale, error: updateError } = await supabase
      .from('sales')
      .update({
        status: 'completed',
        payment_method: updatedPaymentMethod,
        payment_type: updatedPaymentType,
        sale_date: new Date().toISOString().split('T')[0] // Set current date as actual sale date upon pickup
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) return res.status(500).json({ error: updateError.message });

    // 4. Record Cash Transaction
    const isCash = updatedPaymentMethod === 'money';
    const isDigital = updatedPaymentMethod === 'pix' || updatedPaymentMethod === 'card' || updatedPaymentMethod === 'bank';
    const desc = `Retirada de aparelho: ${updatedSale.device_model_manual || 'Aparelho'}`;

    await supabase.from('cash_transactions').insert({
      unit_id: updatedSale.store_id,
      shift_id: activeShift.id,
      type: 'inflow',
      category: 'sale',
      amount: Number(updatedSale.total_value),
      payment_method: updatedPaymentMethod,
      description: desc,
      sale_id: updatedSale.id,
      created_by: updatedSale.seller_id || activeShift.opened_by
    });

    // 5. Update shift expected balances
    const updatePayload: any = {};
    if (isCash) {
      updatePayload.expected_cash = Number(activeShift.expected_cash || 0) + Number(updatedSale.total_value);
    } else if (isDigital) {
      updatePayload.expected_digital = Number(activeShift.expected_digital || 0) + Number(updatedSale.total_value);
    }
    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('cash_shifts').update(updatePayload).eq('id', activeShift.id);
    }

    res.json(updatedSale);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
