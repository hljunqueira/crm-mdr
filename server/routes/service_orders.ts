import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { updateCollaboratorGoalProgress } from "../lib/goalsHelper.js";
import { formatWhatsAppJid } from "../lib/phoneHelper.js";
import { db } from "../db/connection.js";
import { repairOrders, repairOrderParts, outsourcedOrders, notificationQueue, customers, profiles } from "../db/schema.js";
import { eq, or, and, inArray } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const useSupabase = (req: any) => {
  const host = req.headers.host || '';
  return host.includes('mdrinformaticaecelulares.com.br') || 
         process.env.IS_VPS === 'true' || 
         (!host.includes('localhost') && !host.includes('127.0.0.1'));
};

function snakeToCamel(str: string): string {
  return str.replace(/([-_][a-z])/g, group =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function mapLocalToCloud(tableName: string, data: any): any {
  const result: any = {};
  for (const k of Object.keys(data)) {
    let pgKey = camelToSnake(k);
    if (k === 'storeId') pgKey = 'unit_id';
    result[pgKey] = data[k];
  }
  return result;
}

// Helper to update parts_value in the parent service_order (works online or offline)
async function updateOsPartsValue(osId: string, isOffline = false) {
  try {
    if (!isOffline) {
      const { data: parts, error } = await supabase
        .from('service_order_parts')
        .select('quantity, unit_price')
        .eq('os_id', osId);

      if (error) {
        console.error('Error fetching OS parts for total calculation:', error);
        return;
      }

      const totalParts = parts ? parts.reduce((sum, p) => sum + (Number(p.quantity || 1) * Number(p.unit_price || 0)), 0) : 0;

      await supabase
        .from('service_orders')
        .update({ parts_value: totalParts })
        .eq('id', osId);
    } else {
      // Offline local calculation
      const parts = await db.select().from(repairOrderParts).where(eq(repairOrderParts.repairOrderId, osId));
      const totalParts = parts.reduce((sum, p) => sum + (Number(p.quantity || 1) * Number(p.salePrice || 0)), 0);

      await db.update(repairOrders)
        .set({ 
          finalCost: totalParts,
          syncStatus: 'pending_update',
          updatedAt: new Date().toISOString()
        })
        .where(eq(repairOrders.id, osId));

      const [updatedOs] = await db.select().from(repairOrders).where(eq(repairOrders.id, osId)).limit(1);
      if (updatedOs) {
        const pgPayload = mapLocalToCloud('repair_orders', updatedOs);
        // syncQueue insert removed (Supabase native mode)
      }
    }
  } catch (err) {
    console.error('Failed to update OS parts value:', err);
  }
}

// Get all service orders
router.get("/", async (req, res) => {
  try {
    const { unit_id } = req.query;

    if (useSupabase(req)) {
      let query = supabase
        .from('service_orders')
        .select('*, customers(name, phone, cpf), outsourced_orders(id, external_status, partner_shop_name, partner_technician_name), profiles:profiles!responsible_technician_id(full_name), created_by:profiles!created_by_id(full_name), finalized_by:profiles!finalized_by_id(full_name), delivered_by:profiles!delivered_by_id(full_name)');

      if (unit_id && unit_id !== 'all') {
        const { data: activeOutsourced } = await supabase
          .from('outsourced_orders')
          .select('os_id')
          .eq('partner_technician_name', `INTERNAL_UNIT:${unit_id}`)
          .in('external_status', ['sent', 'repairing']);

        const outsourcedOsIds = (activeOutsourced || []).map(o => o.os_id);

        if (outsourcedOsIds.length > 0) {
          query = query.or(`unit_id.eq.${unit_id},id.in.(${outsourcedOsIds.join(',')})`);
        } else {
          query = query.eq('unit_id', unit_id);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // SQLite local fallback
    // In offline mode we query repairOrders, left joining customers, outsourcedOrders, profiles
    let osList = await db.select({
      id: repairOrders.id,
      customerId: repairOrders.customerId,
      technicianId: repairOrders.technicianId,
      deviceModel: repairOrders.deviceModel,
      imei: repairOrders.imei,
      problemDescription: repairOrders.problemDescription,
      techNotes: repairOrders.techNotes,
      estimatedCost: repairOrders.estimatedCost,
      finalCost: repairOrders.finalCost,
      entryDate: repairOrders.entryDate,
      exitDate: repairOrders.exitDate,
      status: repairOrders.status,
      createdAt: repairOrders.createdAt,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerCpf: customers.cpf
    })
    .from(repairOrders)
    .leftJoin(customers, eq(repairOrders.customerId, customers.id))
    .orderBy(repairOrders.createdAt);

    // Filter by unit if specified
    // In our SQLite repairOrders table, we references unit_id but wait, the storeId field acts as unit_id.
    // If unit_id is specified:
    // For simplicity, return all local OS since it's the offline app running on this terminal
    const formatted = osList.map(o => ({
      id: o.id,
      customer_id: o.customerId,
      responsible_technician_id: o.technicianId,
      device_model: o.deviceModel,
      imei: o.imei,
      problem_description: o.problemDescription,
      tech_notes: o.techNotes,
      estimated_cost: o.estimatedCost,
      final_cost: o.finalCost,
      entry_date: o.entryDate,
      exit_date: o.exitDate,
      status: o.status,
      created_at: o.createdAt,
      customers: o.customerName ? { name: o.customerName, phone: o.customerPhone, cpf: o.customerCpf } : null,
      outsourced_orders: null,
      profiles: null
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single service order details with its parts
router.get("/:id", async (req, res) => {
  try {
    if (useSupabase(req)) {
      const { data: os, error: osError } = await supabase
        .from('service_orders')
        .select('*, customers(*), outsourced_orders(id, external_status), profiles:profiles!responsible_technician_id(full_name), created_by:profiles!created_by_id(full_name), finalized_by:profiles!finalized_by_id(full_name), delivered_by:profiles!delivered_by_id(full_name)')
        .eq('id', req.params.id)
        .single();

      if (osError || !os) {
        return res.status(404).json({ error: osError?.message || "Ordem de Serviço não encontrada" });
      }

      const { data: parts, error: partsError } = await supabase
        .from('service_order_parts')
        .select('*')
        .eq('os_id', req.params.id);

      return res.json({
        ...os,
        parts: parts || []
      });
    }

    // SQLite local fallback
    const [os] = await db.select().from(repairOrders).where(eq(repairOrders.id, req.params.id)).limit(1);
    if (!os) {
      return res.status(404).json({ error: "Ordem de Serviço não encontrada" });
    }

    const [cust] = await db.select().from(customers).where(eq(customers.id, os.customerId || '')).limit(1);
    const parts = await db.select().from(repairOrderParts).where(eq(repairOrderParts.repairOrderId, os.id));

    const formattedParts = parts.map(p => ({
      id: p.id,
      os_id: p.repairOrderId,
      part_name: p.partName,
      quantity: p.quantity,
      cost_price: p.costPrice,
      sale_price: p.salePrice,
      created_at: p.createdAt
    }));

    res.json({
      id: os.id,
      customer_id: os.customerId,
      responsible_technician_id: os.technicianId,
      device_model: os.deviceModel,
      imei: os.imei,
      problem_description: os.problemDescription,
      tech_notes: os.techNotes,
      estimated_cost: os.estimatedCost,
      final_cost: os.finalCost,
      entry_date: os.entryDate,
      exit_date: os.exitDate,
      status: os.status,
      created_at: os.createdAt,
      customers: cust ? {
        id: cust.id,
        name: cust.name,
        cpf: cust.cpf,
        phone: cust.phone
      } : null,
      parts: formattedParts
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new Service Order (OS)
router.post("/", async (req, res) => {
  try {
    if (useSupabase(req)) {
      const { data, error } = await supabase
        .from('service_orders')
        .insert([req.body])
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      if (data && data.responsible_technician_id) {
        try {
          const dateStr = data.delivered_at || data.created_at || new Date().toISOString();
          const dateObj = new Date(dateStr.split('T')[0] + 'T12:00:00');
          const m = dateObj.getMonth() + 1;
          const y = dateObj.getFullYear();
          await updateCollaboratorGoalProgress(data.responsible_technician_id, m, y);
        } catch (err) {
          console.error('Error updating goal progress on OS creation:', err);
        }
      }

      return res.status(201).json(data);
    }

    // SQLite local fallback
    const id = req.body.id || crypto.randomUUID();
    const newOs: any = {
      id,
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };

    for (const key of Object.keys(req.body)) {
      const newKey = snakeToCamel(key);
      if (newKey === 'customerId') newOs.customerId = req.body[key];
      else if (newKey === 'responsibleTechnicianId') newOs.technicianId = req.body[key];
      else if (newKey === 'deviceModel') newOs.deviceModel = req.body[key];
      else if (newKey === 'problemDescription') newOs.problemDescription = req.body[key];
      else if (newKey === 'techNotes') newOs.techNotes = req.body[key];
      else if (newKey === 'estimatedCost') newOs.estimatedCost = Number(req.body[key] || 0);
      else if (newKey === 'finalCost') newOs.finalCost = Number(req.body[key] || 0);
      else if (newKey === 'entryDate') newOs.entryDate = req.body[key];
      else if (newKey === 'exitDate') newOs.exitDate = req.body[key];
      else if (newKey === 'status') newOs.status = req.body[key];
    }

    await db.insert(repairOrders).values(newOs);

    const pgPayload = mapLocalToCloud('repair_orders', newOs);

    // syncQueue insert removed (Supabase native mode)

    res.status(201).json(pgPayload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Service Order
router.patch("/:id", async (req, res) => {
  try {
    const { status, finalized_by_id, delivered_by_id } = req.body;

    if (useSupabase(req)) {
      const { data: currentOs } = await supabase
        .from('service_orders')
        .select('status, finalized_by_id, delivered_by_id, unit_id, os_number, labor_value, parts_value, device_brand, device_model, responsible_technician_id, delivered_at, created_at')
        .eq('id', req.params.id)
        .single();

      if (status === 'ready' || status === 'returned_no_fix') {
        if (!finalized_by_id && !currentOs?.finalized_by_id) {
          return res.status(400).json({ error: "Identificação obrigatória: Por favor, selecione e valide o técnico responsável pela conclusão." });
        }
      }

      if (status === 'delivered') {
        if (!delivered_by_id && !currentOs?.delivered_by_id) {
          return res.status(400).json({ error: "Identificação obrigatória: Por favor, selecione e valide o operador que realizou a entrega." });
        }
      }

      const { data: updatedOs, error } = await supabase
        .from('service_orders')
        .update(req.body)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) return res.status(404).json({ error: error.message });

      // Deduct stock if in_progress
      if (status === 'in_progress' && currentOs?.status !== 'in_progress') {
        const { data: osParts } = await supabase
          .from('service_order_parts')
          .select('inventory_item_id, quantity')
          .eq('os_id', req.params.id);

        if (osParts && osParts.length > 0) {
          for (const part of osParts) {
            if (part.inventory_item_id && part.quantity > 0) {
              const { data: device } = await supabase
                .from('devices')
                .select('quantity')
                .eq('id', part.inventory_item_id)
                .single();

              if (device) {
                const currentStock = Number(device.quantity || 0);
                const newStock = Math.max(0, currentStock - part.quantity);

                await supabase
                  .from('devices')
                  .update({ quantity: newStock })
                  .eq('id', part.inventory_item_id);
              }
            }
          }
        }
      }

      if (updatedOs) {
        try {
          if (status === 'ready' || status === 'returned_no_fix') {
            const extStatus = status === 'ready' ? 'ready' : 'returned';
            await supabase
              .from('outsourced_orders')
              .update({ external_status: extStatus, returned_at: new Date().toISOString() })
              .eq('os_id', req.params.id)
              .in('external_status', ['sent', 'repairing']);
          }

          const dateStr = updatedOs.delivered_at || updatedOs.created_at || new Date().toISOString();
          const dateObj = new Date(dateStr.split('T')[0] + 'T12:00:00');
          const m = dateObj.getMonth() + 1;
          const y = dateObj.getFullYear();
          await updateCollaboratorGoalProgress(updatedOs.responsible_technician_id, m, y);
        } catch (err) {
          console.error('Error updating goal progress:', err);
        }
      }

      return res.json(updatedOs);
    }

    // SQLite local fallback
    const updateData: any = {};
    for (const key of Object.keys(req.body)) {
      const newKey = snakeToCamel(key);
      if (newKey === 'customerId') updateData.customerId = req.body[key];
      else if (newKey === 'responsibleTechnicianId') updateData.technicianId = req.body[key];
      else if (newKey === 'deviceModel') updateData.deviceModel = req.body[key];
      else if (newKey === 'problemDescription') updateData.problemDescription = req.body[key];
      else if (newKey === 'techNotes') updateData.techNotes = req.body[key];
      else if (newKey === 'estimatedCost') updateData.estimatedCost = Number(req.body[key] || 0);
      else if (newKey === 'finalCost') updateData.finalCost = Number(req.body[key] || 0);
      else if (newKey === 'entryDate') updateData.entryDate = req.body[key];
      else if (newKey === 'exitDate') updateData.exitDate = req.body[key];
      else if (newKey === 'status') updateData.status = req.body[key];
    }
    updateData.syncStatus = 'pending_update';
    updateData.updatedAt = new Date().toISOString();

    await db.update(repairOrders).set(updateData).where(eq(repairOrders.id, req.params.id));

    const [updatedOs] = await db.select().from(repairOrders).where(eq(repairOrders.id, req.params.id)).limit(1);
    if (!updatedOs) return res.status(404).json({ error: "OS não encontrada" });

    const pgPayload = mapLocalToCloud('repair_orders', updatedOs);

    // syncQueue insert removed (Supabase native mode)

    res.json(pgPayload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Service Order
router.delete("/:id", async (req, res) => {
  try {
    if (useSupabase(req)) {
      const { data: currentOs } = await supabase
        .from('service_orders')
        .select('responsible_technician_id, delivered_at, created_at')
        .eq('id', req.params.id)
        .maybeSingle();

      const { error } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', req.params.id);

      if (error) return res.status(500).json({ error: error.message });

      if (currentOs && currentOs.responsible_technician_id) {
        try {
          const dateStr = currentOs.delivered_at || currentOs.created_at || new Date().toISOString();
          const dateObj = new Date(dateStr.split('T')[0] + 'T12:00:00');
          const m = dateObj.getMonth() + 1;
          const y = dateObj.getFullYear();
          await updateCollaboratorGoalProgress(currentOs.responsible_technician_id, m, y);
        } catch (err) {
          console.error('Error updating goal progress:', err);
        }
      }

      return res.status(204).send();
    }

    // SQLite local fallback
    const [oldOs] = await db.select().from(repairOrders).where(eq(repairOrders.id, req.params.id)).limit(1);
    if (!oldOs) return res.status(404).json({ error: "OS não encontrada" });

    await db.delete(repairOrders).where(eq(repairOrders.id, req.params.id));

    // syncQueue insert removed (Supabase native mode)

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sub-routes: Add part to OS
router.post("/:id/parts", async (req, res) => {
  try {
    if (useSupabase(req)) {
      const { data, error } = await supabase
        .from('service_order_parts')
        .insert([{ ...req.body, os_id: req.params.id }])
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      await updateOsPartsValue(req.params.id);
      return res.status(201).json(data);
    }

    // SQLite local fallback
    const id = req.body.id || crypto.randomUUID();
    const newPart = {
      id,
      repairOrderId: req.params.id,
      partName: req.body.part_name,
      quantity: Number(req.body.quantity || 1),
      costPrice: Number(req.body.cost_price || 0),
      salePrice: Number(req.body.sale_price || 0),
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };

    await db.insert(repairOrderParts).values(newPart);

    const pgPayload = {
      id: newPart.id,
      os_id: newPart.repairOrderId,
      part_name: newPart.partName,
      quantity: newPart.quantity,
      cost_price: newPart.costPrice,
      sale_price: newPart.salePrice,
      created_at: newPart.updatedAt
    };

    // syncQueue insert removed (Supabase native mode)

    await updateOsPartsValue(req.params.id, true);

    res.status(201).json(pgPayload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sub-routes: Delete part from OS
router.delete("/:id/parts/:partId", async (req, res) => {
  try {
    if (useSupabase(req)) {
      const { error } = await supabase
        .from('service_order_parts')
        .delete()
        .eq('id', req.params.partId);

      if (error) return res.status(500).json({ error: error.message });

      await updateOsPartsValue(req.params.id);
      return res.status(204).send();
    }

    // SQLite local fallback
    const [oldPart] = await db.select().from(repairOrderParts).where(eq(repairOrderParts.id, req.params.partId)).limit(1);
    if (!oldPart) return res.status(404).json({ error: "Peça não encontrada" });

    await db.delete(repairOrderParts).where(eq(repairOrderParts.id, req.params.partId));

    // syncQueue insert removed (Supabase native mode)

    await updateOsPartsValue(req.params.id, true);

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send WhatsApp OS Status Notification Trigger (can be queued offline)
router.post("/:id/notify", async (req, res) => {
  try {
    const { templateType } = req.body;

    if (useSupabase(req)) {
      const { data: os, error } = await supabase
        .from('service_orders')
        .select('*, customers(*)')
        .eq('id', req.params.id)
        .single();

      if (error || !os || !os.customers) {
        return res.status(444).json({ error: "OS ou Cliente inválido para notificações" });
      }

      const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('id', os.unit_id)
        .single();

      let { data: channels } = await supabase
        .from('automation_channels')
        .select('*')
        .eq('status', 'connected')
        .eq('unit_id', os.unit_id)
        .limit(1);

      if (!channels || channels.length === 0) {
        const { data: fallbackChannels } = await supabase
          .from('automation_channels')
          .select('*')
          .eq('status', 'connected')
          .limit(1);
        channels = fallbackChannels;
      }

      if (!channels || channels.length === 0) {
        return res.status(400).json({ error: "Nenhum canal do WhatsApp conectado no momento." });
      }

      const instance = channels[0].instance_name;
      const remoteJid = formatWhatsAppJid(os.customers.phone);
      const numberStr = String(os.os_number).padStart(4, '0');
      const laborStr = Number(os.labor_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const partsStr = Number(os.parts_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const totalStr = Number(os.labor_value + os.parts_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      let deviceNameStr = `${(os.device_brand || '').trim()} ${(os.device_model || '').trim()}`.trim();
      
      const fillTemplate = (template: string, vars: Record<string, string | number>) => {
        let text = template;
        for (const [key, value] of Object.entries(vars)) {
          text = text.replace(new RegExp(`{${key}}`, 'gi'), String(value));
        }
        return text;
      };

      const variables = {
        nome_cliente: os.customers.name,
        numero_os: numberStr,
        aparelho: deviceNameStr,
        problema_relatado: os.reported_issue,
        acessorios: os.accessories_left ? os.accessories_left.join(', ') : 'Nenhum',
        valor_pecas: partsStr,
        valor_mao_de_obra: laborStr,
        valor_total: totalStr,
        prazo_garantia: os.warranty_period || 90
      };

      let messageText = '';
      if (templateType === 'entry') {
        messageText = store?.os_entry_template ? fillTemplate(store.os_entry_template, variables) : `🛠️ OS Entry Alert`;
      } else if (templateType === 'budget') {
        messageText = store?.os_budget_template ? fillTemplate(store.os_budget_template, variables) : `📊 OS Budget Alert`;
      } else if (templateType === 'ready') {
        messageText = store?.os_ready_template ? fillTemplate(store.os_ready_template, variables) : `🎉 OS Ready Alert`;
      }

      const n8nWebhookUrl = `${process.env.N8N_API_URL || 'https://n8n.mdrinformaticaecelulares.com.br'}/webhook/os-status-alert`;
      
      try {
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
          },
          body: JSON.stringify({
            instanceName: instance,
            remoteJid: remoteJid,
            text: messageText
          })
        });

        if (!response.ok) {
          throw new Error("HTTP " + response.status);
        }
      } catch (webhookErr) {
        // Queue it locally if it fails
        await db.insert(notificationQueue).values({
          url: n8nWebhookUrl,
          method: 'POST',
          headers: JSON.stringify({
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
          }),
          body: JSON.stringify({
            instanceName: instance,
            remoteJid: remoteJid,
            text: messageText
          }),
          attempts: 1,
          lastError: 'Direct webhook send failed'
        });
      }

      return res.json({ success: true, message: "Mensagem de status enviada (ou agendada) com sucesso!" });
    }

    // Local Offline Trigger (always queued)
    const [osLocal] = await db.select().from(repairOrders).where(eq(repairOrders.id, req.params.id)).limit(1);
    if (!osLocal) return res.status(404).json({ error: "OS não encontrada" });

    const [custLocal] = await db.select().from(customers).where(eq(customers.id, osLocal.customerId || '')).limit(1);
    if (!custLocal) return res.status(444).json({ error: "Cliente não encontrado" });

    const instance = 'MDR';
    const remoteJid = formatWhatsAppJid(custLocal.phone || '');
    const messageText = `🛠️ *MDR Informática & Celulares* - Alerta de OS em modo Offline para ${custLocal.name}.`;

    const n8nWebhookUrl = `${process.env.N8N_API_URL || 'https://n8n.mdrinformaticaecelulares.com.br'}/webhook/os-status-alert`;

    await db.insert(notificationQueue).values({
      url: n8nWebhookUrl,
      method: 'POST',
      headers: JSON.stringify({
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': process.env.N8N_API_KEY || ''
      }),
      body: JSON.stringify({
        instanceName: instance,
        remoteJid: remoteJid,
        text: messageText
      }),
      attempts: 0
    });

    res.json({ success: true, message: "Notificação enfileirada offline com sucesso!" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Outsourced endpoints fallbacks (simplified offline mappings)
router.get("/:id/outsource", async (req, res) => {
  try {
    if (useSupabase(req)) {
      const { data, error } = await supabase
        .from('outsourced_orders')
        .select('*')
        .eq('os_id', req.params.id)
        .maybeSingle();

      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    const [data] = await db.select().from(outsourcedOrders).where(eq(outsourcedOrders.osId, req.params.id)).limit(1);
    if (!data) return res.json(null);
    res.json({
      id: data.id,
      os_id: data.osId,
      partner_shop_name: data.partnerShopName,
      partner_technician_name: data.partnerTechnicianName,
      external_status: data.externalStatus,
      external_cost: data.externalCost,
      tracking_code: data.trackingCode,
      notes: data.notes,
      sent_at: data.sentAt,
      returned_at: data.returnedAt
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/global/outsourced", async (req, res) => {
  try {
    if (useSupabase(req)) {
      const { data, error } = await supabase
        .from('outsourced_orders')
        .select('*, service_orders!inner(*, customers(name, phone))');

      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    const result = await db.select({
      id: outsourcedOrders.id,
      osId: outsourcedOrders.osId,
      partnerShopName: outsourcedOrders.partnerShopName,
      partnerTechnicianName: outsourcedOrders.partnerTechnicianName,
      externalStatus: outsourcedOrders.externalStatus,
      externalCost: outsourcedOrders.externalCost,
      trackingCode: outsourcedOrders.trackingCode,
      notes: outsourcedOrders.notes,
      sentAt: outsourcedOrders.sentAt,
      returnedAt: outsourcedOrders.returnedAt,
      deviceModel: repairOrders.deviceModel,
      customerId: repairOrders.customerId
    })
    .from(outsourcedOrders)
    .leftJoin(repairOrders, eq(outsourcedOrders.osId, repairOrders.id));

    const formatted = [];
    for (const r of result) {
      const [cust] = await db.select().from(customers).where(eq(customers.id, r.customerId || '')).limit(1);
      formatted.push({
        id: r.id,
        os_id: r.osId,
        partner_shop_name: r.partnerShopName,
        partner_technician_name: r.partnerTechnicianName,
        external_status: r.externalStatus,
        external_cost: r.externalCost,
        tracking_code: r.trackingCode,
        notes: r.notes,
        sent_at: r.sentAt,
        returned_at: r.returnedAt,
        service_orders: {
          id: r.osId,
          device_model: r.deviceModel,
          customers: cust ? { name: cust.name, phone: cust.phone } : null
        }
      });
    }

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/outsource", async (req, res) => {
  try {
    if (useSupabase(req)) {
      const { data, error } = await supabase
        .from('outsourced_orders')
        .insert([{
          os_id: req.params.id,
          partner_shop_name: req.body.partner_shop_name,
          partner_technician_name: req.body.partner_technician_name,
          external_cost: Number(req.body.external_cost) || 0,
          tracking_code: req.body.tracking_code,
          notes: req.body.notes,
          external_status: 'sent'
        }])
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(data);
    }

    // SQLite local fallback
    const id = req.body.id || crypto.randomUUID();
    const newOutsourced = {
      id,
      osId: req.params.id,
      partnerShopName: req.body.partner_shop_name,
      partnerTechnicianName: req.body.partner_technician_name,
      externalCost: Number(req.body.external_cost || 0),
      trackingCode: req.body.tracking_code,
      notes: req.body.notes,
      externalStatus: 'sent',
      sentAt: new Date().toISOString(),
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };

    await db.insert(outsourcedOrders).values(newOutsourced);

    const pgPayload = {
      id: newOutsourced.id,
      os_id: newOutsourced.osId,
      partner_shop_name: newOutsourced.partnerShopName,
      partner_technician_name: newOutsourced.partnerTechnicianName,
      external_cost: newOutsourced.externalCost,
      tracking_code: newOutsourced.trackingCode,
      notes: newOutsourced.notes,
      external_status: newOutsourced.externalStatus,
      sent_at: newOutsourced.sentAt
    };

    // syncQueue insert removed (Supabase native mode)

    res.status(201).json(pgPayload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/outsource/:outsourceId", async (req, res) => {
  try {
    if (useSupabase(req)) {
      const updateData: any = {};
      const { external_status, partner_shop_name, partner_technician_name, external_cost, tracking_code, notes } = req.body;
      if (external_status !== undefined) updateData.external_status = external_status;
      if (partner_shop_name !== undefined) updateData.partner_shop_name = partner_shop_name;
      if (partner_technician_name !== undefined) updateData.partner_technician_name = partner_technician_name;
      if (external_cost !== undefined) updateData.external_cost = Number(external_cost) || 0;
      if (tracking_code !== undefined) updateData.tracking_code = tracking_code;
      if (notes !== undefined) updateData.notes = notes;

      if (external_status === 'ready' || external_status === 'returned') {
        updateData.returned_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('outsourced_orders')
        .update(updateData)
        .eq('id', req.params.outsourceId)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    // SQLite local fallback
    const updateDataLocal: any = {};
    for (const key of Object.keys(req.body)) {
      const camelKey = snakeToCamel(key);
      if (camelKey === 'externalCost') updateDataLocal.externalCost = Number(req.body[key] || 0);
      else updateDataLocal[camelKey] = req.body[key];
    }
    
    if (req.body.external_status === 'ready' || req.body.external_status === 'returned') {
      updateDataLocal.returnedAt = new Date().toISOString();
    }
    updateDataLocal.syncStatus = 'pending_update';
    updateDataLocal.updatedAt = new Date().toISOString();

    await db.update(outsourcedOrders).set(updateDataLocal).where(eq(outsourcedOrders.id, req.params.outsourceId));

    const [updatedOut] = await db.select().from(outsourcedOrders).where(eq(outsourcedOrders.id, req.params.outsourceId)).limit(1);
    if (!updatedOut) return res.status(404).json({ error: "OS Terceirizada não encontrada" });

    const pgPayload = mapLocalToCloud('outsourced_orders', updatedOut);

    // syncQueue insert removed (Supabase native mode)

    res.json(pgPayload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id/outsource/:outsourceId", async (req, res) => {
  try {
    if (useSupabase(req)) {
      const { error } = await supabase
        .from('outsourced_orders')
        .delete()
        .eq('id', req.params.outsourceId);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(204).send();
    }

    // SQLite local fallback
    const [oldOut] = await db.select().from(outsourcedOrders).where(eq(outsourcedOrders.id, req.params.outsourceId)).limit(1);
    if (!oldOut) return res.status(404).json({ error: "OS Terceirizada não encontrada" });

    await db.delete(outsourcedOrders).where(eq(outsourcedOrders.id, req.params.outsourceId));

    // syncQueue insert removed (Supabase native mode)

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
