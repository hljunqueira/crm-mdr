import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { deleteAsaasPayment } from "../services/asaasService.js";
import { updateCollaboratorGoalProgress } from "../lib/goalsHelper.js";

const router = Router();

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'https://whatsapp.mdrinformaticaecelulares.com.br';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'MDR_SECRET_TOKEN_2024';

const validSalesColumns = [
  'store_id', 'customer_id', 'seller_id', 'device_id', 'device_model_manual', 
  'imei_manual', 'total_value', 'down_payment', 'installments_count', 
  'service_fee', 'original_price', 'sale_date', 'status', 'payment_type', 
  'accessories', 'is_trade_in', 'trade_in_device_brand', 'trade_in_device_model', 
  'trade_in_device_imei', 'trade_in_valuation', 'trade_in_sale_price_estimate',
  'payment_method'
];

const syncDeviceLocks = async (sale: any) => {
  try {
    const imeiStr = (sale.imei_manual || '').trim();
    const hasImei = imeiStr !== '' && imeiStr.toUpperCase() !== 'N/A' && imeiStr !== '0000000';

    if (sale.payment_type !== 'crediario' || !hasImei) {
      await supabase.from('device_locks').delete().eq('sale_id', sale.id);
      return;
    }
    const deviceId = sale.device_id;
    const currentDeviceIds: string[] = [];

    if (deviceId) {
      const { data: dev } = await supabase
        .from('devices')
        .select('brand, category')
        .eq('id', deviceId)
        .maybeSingle();

      if (dev && dev.category === 'smartphone') {
        currentDeviceIds.push(deviceId);
        const brandLower = (dev.brand || '').toLowerCase();
        const isIphone = brandLower === 'apple' || brandLower.includes('iphone') || 
                         (sale.device_model_manual || '').toLowerCase().includes('iphone') || 
                         (sale.device_model_manual || '').toLowerCase().includes('apple');
        const lockType = isIphone ? 'icloud' : 'android';

        const { data: existingLock } = await supabase
          .from('device_locks')
          .select('id')
          .eq('sale_id', sale.id)
          .eq('device_id', deviceId)
          .maybeSingle();

        if (!existingLock) {
          await supabase
            .from('device_locks')
            .insert({
              device_id: deviceId,
              sale_id: sale.id,
              lock_type: lockType,
              icloud_locked: false,
              mdm_locked: false
            });
        }
      }
    } else {
      const imeis = imeiStr.split(',').map((i: string) => i.trim()).filter(Boolean);
      for (const imei of imeis) {
        if (imei !== 'N/A' && imei !== '0000000') {
          const { data: dev } = await supabase
            .from('devices')
            .select('id, brand, category')
            .eq('imei', imei)
            .maybeSingle();

          if (dev && dev.category === 'smartphone') {
            currentDeviceIds.push(dev.id);
            const brandLower = (dev.brand || '').toLowerCase();
            const lockType = (brandLower === 'apple' || brandLower.includes('iphone')) ? 'icloud' : 'android';
            
            const { data: existingLock } = await supabase
              .from('device_locks')
              .select('id')
              .eq('sale_id', sale.id)
              .eq('device_id', dev.id)
              .maybeSingle();

            if (!existingLock) {
              await supabase
                .from('device_locks')
                .insert({
                  device_id: dev.id,
                  sale_id: sale.id,
                  lock_type: lockType,
                  icloud_locked: false,
                  mdm_locked: false
                });
            }
          }
        }
      }
    }

    if (currentDeviceIds.length > 0) {
      // Clean string formatting for the IN query: construct raw list format safely
      const idList = currentDeviceIds.map(id => `'${id}'`).join(',');
      await supabase
        .from('device_locks')
        .delete()
        .eq('sale_id', sale.id)
        .filter('device_id', 'not.in', `(${idList})`);
      
      // Also delete any virtual lock where device_id is null since we have real devices
      await supabase
        .from('device_locks')
        .delete()
        .eq('sale_id', sale.id)
        .is('device_id', null);
    } else {
      let shouldCreateNullLock = false;
      if (deviceId) {
        shouldCreateNullLock = false;
      } else {
        shouldCreateNullLock = true;
      }

      if (shouldCreateNullLock) {
        const { data: existingNullLock } = await supabase
          .from('device_locks')
          .select('id')
          .eq('sale_id', sale.id)
          .is('device_id', null)
          .maybeSingle();

        if (!existingNullLock) {
          const isIphone = (sale.device_model_manual || '').toLowerCase().includes('iphone') || 
                           (sale.device_model_manual || '').toLowerCase().includes('apple');
          const lockType = isIphone ? 'icloud' : 'android';

          await supabase
            .from('device_locks')
            .insert({
              device_id: null,
              sale_id: sale.id,
              lock_type: lockType,
              icloud_locked: false,
              mdm_locked: false
            });
        }

        // Delete any locks for this sale where device_id is NOT null
        await supabase
          .from('device_locks')
          .delete()
          .eq('sale_id', sale.id)
          .not('device_id', 'is', null);
      } else {
        await supabase
          .from('device_locks')
          .delete()
          .eq('sale_id', sale.id);
      }
    }
  } catch (err) {
    console.error(`[syncDeviceLocks] Error synchronizing device locks for sale ${sale.id}:`, err);
  }
};

// Get all sales
router.get("/", async (req, res) => {
  const { unit_id } = req.query;
  let query = supabase
    .from('sales')
    .select('*, customers(name), profiles(full_name), devices(cost_price)');

  if (unit_id && unit_id !== 'all') {
    query = query.eq('store_id', unit_id);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post("/", async (req, res) => {
  const { store_id, seller_id, customer_id, is_trade_in, trade_in_device_imei, trade_in_device_brand, trade_in_device_model, trade_in_valuation, trade_in_sale_price_estimate } = req.body;
  if (!store_id) {
    return res.status(400).json({ error: "O campo store_id (unidade) é obrigatório." });
  }

  if (customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('is_simulation')
      .eq('id', customer_id)
      .maybeSingle();

    if (customer && customer.is_simulation) {
      return res.status(400).json({ error: "Este é um cliente de simulação. Vendas reais não são permitidas para este cadastro." });
    }
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

    // Vincular venda ao dispositivo fisico correto caso o IMEI bipado/digitado seja encontrado
    const imeiManual = String(req.body.imei_manual || '').trim();
    if (imeiManual && imeiManual.toUpperCase() !== 'N/A' && imeiManual !== '0000000') {
      const { data: specDevice } = await supabase
        .from('devices')
        .select('id, investor_id')
        .eq('imei', imeiManual)
        .eq('status', 'available')
        .maybeSingle();

      if (specDevice) {
        cleanSaleBody['device_id'] = specDevice.id;
      }
    }

    // Validar se o investidor é do tipo conservador e a venda é crediário, ou se é venda somente à vista
    let targetDeviceId = cleanSaleBody['device_id'] || req.body.device_id;
    if (targetDeviceId) {
      const { data: devObj } = await supabase
        .from('devices')
        .select('investor_id, only_cash_sale')
        .eq('id', targetDeviceId)
        .maybeSingle();

      if (devObj) {
        if (devObj.only_cash_sale) {
          if (req.body.payment_type !== 'vista' && req.body.payment_type !== 'debit') {
            return res.status(400).json({
              error: "Este aparelho está configurado para venda somente à vista (não é permitido crediário ou cartão de crédito parcelado)."
            });
          }
        }

        if (devObj.investor_id) {
          const { data: investorProfile } = await supabase
            .from('profiles')
            .select('investor_profile')
            .eq('id', devObj.investor_id)
            .maybeSingle();

          if (investorProfile?.investor_profile === 'conservador') {
            if (req.body.payment_type === 'crediario') {
              return res.status(400).json({ 
                error: "Este aparelho pertence a um investidor conservador e só pode ser vendido à vista (não é permitido crediário)." 
              });
            }
          }
        }
      }
    }

    // 2. Insert Sale
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([cleanSaleBody])
      .select()
      .single();

    if (saleError) return res.status(500).json({ error: saleError.message });

    // Sincronização de Bloqueios Automática (device_locks)
    await syncDeviceLocks(saleData);

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

    if (saleData && saleData.seller_id) {
      try {
        const saleDate = saleData.sale_date || saleData.created_at || new Date().toISOString();
        const dateObj = new Date(saleDate.split('T')[0] + 'T12:00:00');
        const m = dateObj.getMonth() + 1;
        const y = dateObj.getFullYear();
        await updateCollaboratorGoalProgress(saleData.seller_id, m, y);
      } catch (err) {
        console.error('Error updating goal progress on sale creation:', err);
      }
    }

    if (saleData && saleData.device_id && req.body.imei_manual) {
      try {
        const cleanImei = String(req.body.imei_manual).trim();
        if (cleanImei && cleanImei.toUpperCase() !== 'N/A' && cleanImei !== '0000000') {
          await supabase
            .from('devices')
            .update({ imei: cleanImei })
            .eq('id', saleData.device_id);
        }
      } catch (deviceUpdateErr) {
        console.error('Error updating device IMEI on sale creation:', deviceUpdateErr);
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
      const restoredDeviceIds = new Set<string>();
      if (oldSale.device_id) {
        const { data: dev } = await supabase.from('devices').select('id, stock_quantity, category').eq('id', oldSale.device_id).maybeSingle();
        if (dev && dev.category !== 'service') {
          const newQty = (dev.stock_quantity || 0) + 1;
          await supabase.from('devices').update({ stock_quantity: newQty, status: 'available' }).eq('id', dev.id);
          restoredDeviceIds.add(dev.id);
        }
      }
      if (oldSale.imei_manual && oldSale.imei_manual !== 'N/A') {
        const imeis = oldSale.imei_manual.split(',').map((i: string) => i.trim()).filter(Boolean);
        for (const imei of imeis) {
          if (imei !== 'N/A' && imei !== '0000000') {
            const { data: dev } = await supabase.from('devices').select('id, stock_quantity, category').eq('imei', imei).maybeSingle();
            if (dev && dev.category !== 'service' && !restoredDeviceIds.has(dev.id)) {
              const newQty = (dev.stock_quantity || 0) + 1;
              await supabase.from('devices').update({ stock_quantity: newQty, status: 'available' }).eq('id', dev.id);
              restoredDeviceIds.add(dev.id);
            }
          }
        }
      }
      if (oldSale.device_model_manual) {
        const parts = oldSale.device_model_manual.split('+').map(p => p.trim()).filter(Boolean);
        for (const part of parts) {
          const cleanName = part.replace(/\s*\(x\d+\)\s*/i, '').trim();
          const qtyMatch = part.match(/\(x(\d+)\)/i);
          const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
          if (cleanName) {
            const { data: devs } = await supabase.from('devices').select('id, stock_quantity, category').eq('model', cleanName).eq('store_id', oldSale.store_id);
            if (devs && devs.length > 0) {
              const dev = devs[0];
              if (dev.category !== 'service' && !restoredDeviceIds.has(dev.id)) {
                const newQty = (dev.stock_quantity || 0) + quantity;
                await supabase.from('devices').update({ stock_quantity: newQty, status: 'available' }).eq('id', dev.id);
                restoredDeviceIds.add(dev.id);
              }
            }
          }
        }
      }

      // Decrement new devices stock
      const decrementedDeviceIds = new Set<string>();
      if (req.body.device_id) {
        const { data: dev } = await supabase.from('devices').select('id, stock_quantity, category').eq('id', req.body.device_id).maybeSingle();
        if (dev && dev.category !== 'service') {
          const newQty = Math.max(0, (dev.stock_quantity || 0) - 1);
          await supabase.from('devices').update({ stock_quantity: newQty, status: newQty === 0 ? 'sold' : 'available' }).eq('id', dev.id);
          decrementedDeviceIds.add(dev.id);
        }
      }
      if (req.body.imei_manual && req.body.imei_manual !== 'N/A') {
        const imeis = req.body.imei_manual.split(',').map((i: string) => i.trim()).filter(Boolean);
        for (const imei of imeis) {
          if (imei !== 'N/A' && imei !== '0000000') {
            const { data: dev } = await supabase.from('devices').select('id, stock_quantity, category').eq('imei', imei).maybeSingle();
            if (dev && dev.category !== 'service' && !decrementedDeviceIds.has(dev.id)) {
              const newQty = Math.max(0, (dev.stock_quantity || 0) - 1);
              await supabase.from('devices').update({ stock_quantity: newQty, status: newQty === 0 ? 'sold' : 'available' }).eq('id', dev.id);
              decrementedDeviceIds.add(dev.id);
            }
          }
        }
      }
      if (req.body.device_model_manual) {
        const parts = req.body.device_model_manual.split('+').map(p => p.trim()).filter(Boolean);
        for (const part of parts) {
          const cleanName = part.replace(/\s*\(x\d+\)\s*/i, '').trim();
          const qtyMatch = part.match(/\(x(\d+)\)/i);
          const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
          if (cleanName) {
            const storeId = req.body.store_id || oldSale.store_id;
            const { data: devs } = await supabase.from('devices').select('id, stock_quantity, category').eq('model', cleanName).eq('store_id', storeId);
            if (devs && devs.length > 0) {
              const dev = devs[0];
              if (dev.category !== 'service' && !decrementedDeviceIds.has(dev.id)) {
                const newQty = Math.max(0, (dev.stock_quantity || 0) - quantity);
                await supabase.from('devices').update({ stock_quantity: newQty, status: newQty === 0 ? 'sold' : 'available' }).eq('id', dev.id);
                decrementedDeviceIds.add(dev.id);
              }
            }
          }
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
          const { data: dev } = await supabase.from('devices').select('id, stock_quantity, category').eq('model', cleanName).limit(1);
          if (dev && dev.length > 0) {
            const target = dev[0];
            if (target.category !== 'service') {
              const newQty = (target.stock_quantity || 0) + 1;
              await supabase.from('devices').update({ stock_quantity: newQty, status: 'available' }).eq('id', target.id);
            }
          }
        }
      }

      // 2. Decrement new accessories
      const newParts = newAccStr.split('|')[0] || '';
      const newAccList = newParts.split(',').map((a: string) => a.trim()).filter(Boolean);
      for (const acc of newAccList) {
        const cleanName = acc.replace(/\s*\([^)]*\)\s*/g, '').trim();
        if (cleanName) {
          const { data: dev } = await supabase.from('devices').select('id, stock_quantity, category').eq('model', cleanName).limit(1);
          if (dev && dev.length > 0) {
            const target = dev[0];
            if (target.category !== 'service') {
              const newQty = Math.max(0, (target.stock_quantity || 0) - 1);
              await supabase.from('devices').update({ stock_quantity: newQty, status: newQty === 0 ? 'sold' : 'available' }).eq('id', target.id);
            }
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

    if (updatedSale && 
        (updatedSale.status === 'cancelled' || updatedSale.status === 'refunded') && 
        (oldSale.status !== 'cancelled' && oldSale.status !== 'refunded')) {
      
      // 1. Clean up and deduct future_receipts for purchased receivables of this sale
      const { data: purchases } = await supabase
        .from('receivable_purchases')
        .select('*')
        .eq('sale_id', req.params.id)
        .eq('status', 'approved');

      if (purchases && purchases.length > 0) {
        for (const pur of purchases) {
          const { data: unpaidInstallments } = await supabase
            .from('installments')
            .select('value')
            .eq('sale_id', req.params.id)
            .neq('status', 'paid')
            .neq('status', 'cancelled');

          const unpaidSum = (unpaidInstallments || []).reduce((sum, inst) => sum + Number(inst.value), 0);
          const remainingAmt = unpaidSum * Number(pur.ownership_percentage || 1);

          const { data: wallet } = await supabase
            .from('wallets')
            .select('future_receipts')
            .eq('profile_id', pur.profile_id)
            .maybeSingle();

          if (wallet) {
            const newFuture = Math.max(0, Number(wallet.future_receipts || 0) - remainingAmt);
            await supabase
              .from('wallets')
              .update({ future_receipts: newFuture })
              .eq('profile_id', pur.profile_id);
          }
        }
        await supabase
          .from('receivable_purchases')
          .delete()
          .eq('sale_id', req.params.id);
      }

      // 2. Update installments to cancelled
      await supabase
        .from('installments')
        .update({ status: 'cancelled' })
        .eq('sale_id', req.params.id)
        .neq('status', 'paid');
    }

    if (updatedSale && updatedSale.device_id && req.body.imei_manual) {
      try {
        const cleanImei = String(req.body.imei_manual).trim();
        if (cleanImei && cleanImei.toUpperCase() !== 'N/A' && cleanImei !== '0000000') {
          await supabase
            .from('devices')
            .update({ imei: cleanImei })
            .eq('id', updatedSale.device_id);
        }
      } catch (deviceUpdateErr) {
        console.error('Error updating device IMEI on sale update:', deviceUpdateErr);
      }
    }

    // Sincronização de Bloqueios Automática (device_locks)
    await syncDeviceLocks(updatedSale);
     
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
     
    if (updatedSale) {
      try {
        const saleDate = updatedSale.sale_date || updatedSale.created_at || new Date().toISOString();
        const dateObj = new Date(saleDate.split('T')[0] + 'T12:00:00');
        const m = dateObj.getMonth() + 1;
        const y = dateObj.getFullYear();
        await updateCollaboratorGoalProgress(updatedSale.seller_id, m, y);

        const oldSaleDate = oldSale.sale_date || oldSale.created_at;
        if (oldSaleDate) {
          const oldDateObj = new Date(oldSaleDate.split('T')[0] + 'T12:00:00');
          const oldM = oldDateObj.getMonth() + 1;
          const oldY = oldDateObj.getFullYear();
          if (oldSale.seller_id !== updatedSale.seller_id || oldM !== m || oldY !== y) {
            await updateCollaboratorGoalProgress(oldSale.seller_id, oldM, oldY);
          }
        }
      } catch (err) {
        console.error('Error updating goal progress on sale update:', err);
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

    // 2. Restore stock for main devices and revert IMEIs/investor balances
    const restoredDeviceIds = new Set<string>();
    if (sale.device_id) {
      const { data: device } = await supabase
        .from('devices')
        .select('*')
        .eq('id', sale.device_id)
        .maybeSingle();

      if (device && device.category !== 'service') {
        const newQty = (device.stock_quantity || 0) + 1;
        const restoredImei = device.imei ? device.imei.replace(/_sold$/, '') : null;
        await supabase
          .from('devices')
          .update({ 
            stock_quantity: newQty, 
            status: 'available',
            imei: restoredImei
          })
          .eq('id', sale.device_id);
        restoredDeviceIds.add(device.id);

        if (device.investor_id) {
          const deviceValuation = Number(device.cost_price || 0);
          const { data: wallet } = await supabase
            .from('wallets')
            .select('future_receipts')
            .eq('profile_id', device.investor_id)
            .maybeSingle();

          if (wallet) {
            const newFuture = Math.max(0, Number(wallet.future_receipts || 0) - deviceValuation);
            await supabase
              .from('wallets')
              .update({ future_receipts: newFuture })
              .eq('profile_id', device.investor_id);
          }
        }
      }
    }
    if (sale.imei_manual && sale.imei_manual !== 'N/A') {
      const imeis = sale.imei_manual.split(',').map((i: string) => i.trim()).filter(Boolean);
      for (const imei of imeis) {
        if (imei !== 'N/A' && imei !== '0000000') {
          const cleanImei = imei.replace(/_sold$/, '');
          const { data: device } = await supabase
            .from('devices')
            .select('*')
            .or(`imei.eq."${cleanImei}",imei.eq."${cleanImei}_sold"`)
            .maybeSingle();

          if (device && device.category !== 'service' && !restoredDeviceIds.has(device.id)) {
            const newQty = (device.stock_quantity || 0) + 1;
            const restoredImei = device.imei ? device.imei.replace(/_sold$/, '') : null;
            await supabase
              .from('devices')
              .update({ 
                stock_quantity: newQty, 
                status: 'available',
                imei: restoredImei
              })
              .eq('id', device.id);
            restoredDeviceIds.add(device.id);

            if (device.investor_id) {
              const deviceValuation = Number(device.cost_price || 0);
              const { data: wallet } = await supabase
                .from('wallets')
                .select('future_receipts')
                .eq('profile_id', device.investor_id)
                .maybeSingle();

              if (wallet) {
                const newFuture = Math.max(0, Number(wallet.future_receipts || 0) - deviceValuation);
                await supabase
                  .from('wallets')
                  .update({ future_receipts: newFuture })
                  .eq('profile_id', device.investor_id);
              }
            }
          }
        }
      }
    }

    // 2.5 Reverter repasses já realizados para investidores nas parcelas pagas desta venda
    const { data: tempInstallments } = await supabase
      .from('installments')
      .select('id')
      .eq('sale_id', req.params.id);

    const tempInstIds = (tempInstallments || []).map(i => i.id);

    if (tempInstIds.length > 0) {
      const { data: txsToRevert } = await supabase
        .from('wallet_transactions')
        .select('*')
        .in('installment_id', tempInstIds);

      if (txsToRevert && txsToRevert.length > 0) {
        for (const tx of txsToRevert) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('profile_id', tx.profile_id)
            .maybeSingle();

          if (wallet) {
            const newBalance = Math.max(0, Number(wallet.balance || 0) - Number(tx.amount || 0));
            await supabase
              .from('wallets')
              .update({ balance: newBalance })
              .eq('id', wallet.id);
          }
        }
        const txIds = txsToRevert.map(t => t.id);
        await supabase
          .from('wallet_transactions')
          .delete()
          .in('id', txIds);
      }
    }

    // 2.6 Clean up and deduct future_receipts for purchased receivables of this sale
    const { data: purchases } = await supabase
      .from('receivable_purchases')
      .select('*')
      .eq('sale_id', req.params.id)
      .eq('status', 'approved');

    if (purchases && purchases.length > 0) {
      for (const pur of purchases) {
        const { data: unpaidInstallments } = await supabase
          .from('installments')
          .select('value')
          .eq('sale_id', req.params.id)
          .neq('status', 'paid')
          .neq('status', 'cancelled');

        const unpaidSum = (unpaidInstallments || []).reduce((sum, inst) => sum + Number(inst.value), 0);
        const remainingAmt = unpaidSum * Number(pur.ownership_percentage || 1);

        const { data: wallet } = await supabase
          .from('wallets')
          .select('future_receipts')
          .eq('profile_id', pur.profile_id)
          .maybeSingle();

        if (wallet) {
          const newFuture = Math.max(0, Number(wallet.future_receipts || 0) - remainingAmt);
          await supabase
            .from('wallets')
            .update({ future_receipts: newFuture })
            .eq('profile_id', pur.profile_id);
        }
      }
      await supabase
        .from('receivable_purchases')
        .delete()
        .eq('sale_id', req.params.id);
    }
    if (sale.device_model_manual) {
      const parts = sale.device_model_manual.split('+').map(p => p.trim()).filter(Boolean);
      for (const part of parts) {
        const cleanName = part.replace(/\s*\(x\d+\)\s*/i, '').trim();
        const qtyMatch = part.match(/\(x(\d+)\)/i);
        const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
        if (cleanName) {
          const { data: devices } = await supabase
            .from('devices')
            .select('id, stock_quantity, category')
            .eq('model', cleanName)
            .eq('store_id', sale.store_id);

          if (devices && devices.length > 0) {
            const target = devices[0];
            if (target.category !== 'service' && !restoredDeviceIds.has(target.id)) {
              const newQty = (target.stock_quantity || 0) + quantity;
              await supabase
                .from('devices')
                .update({ stock_quantity: newQty, status: 'available' })
                .eq('id', target.id);
              restoredDeviceIds.add(target.id);
            }
          }
        }
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
            .select('id, stock_quantity, category')
            .eq('model', cleanName)
            .limit(1);

          if (device && device.length > 0) {
            const targetDevice = device[0];
            if (targetDevice.category !== 'service' && !restoredDeviceIds.has(targetDevice.id)) {
              const newQty = (targetDevice.stock_quantity || 0) + 1;
              await supabase
                .from('devices')
                .update({ stock_quantity: newQty, status: 'available' })
                .eq('id', targetDevice.id);
              restoredDeviceIds.add(targetDevice.id);
            }
          }
        }
      }
    }

    // 4. Cancel/Delete Asaas payments associated with the installments of this sale
    const { data: saleInstallments } = await supabase
      .from('installments')
      .select('id, asaas_payment_id')
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

    // 4.5 Revert cash transactions associated with this sale or its installments
    const installmentIds = saleInstallments?.map((inst: any) => inst.id) || [];
    let txQuery = supabase.from('cash_transactions').select('*');
    if (installmentIds.length > 0) {
      const formattedIds = installmentIds.map(id => `"${id}"`).join(',');
      txQuery = txQuery.or(`sale_id.eq.${req.params.id},installment_id.in.(${formattedIds})`);
    } else {
      txQuery = txQuery.eq('sale_id', req.params.id);
    }
    const { data: transactions } = await txQuery;
       
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
      const txIds = transactions.map((tx: any) => tx.id);
      await supabase.from('cash_transactions').delete().in('id', txIds);
    }

    // 5. Finally delete the sale (which cascades to delete installments)
    const { error: deleteError } = await supabase
      .from('sales')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    if (sale && sale.seller_id) {
      try {
        const saleDate = sale.sale_date || sale.created_at || new Date().toISOString();
        const dateObj = new Date(saleDate.split('T')[0] + 'T12:00:00');
        const m = dateObj.getMonth() + 1;
        const y = dateObj.getFullYear();
        await updateCollaboratorGoalProgress(sale.seller_id, m, y);
      } catch (err) {
        console.error('Error updating goal progress on sale delete:', err);
      }
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
