import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Helper to update parts_value in the parent service_order
async function updateOsPartsValue(osId: string) {
  try {
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
  } catch (err) {
    console.error('Failed to update OS parts value:', err);
  }
}

// Get all service orders
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('service_orders')
      .select('*, customers(name, phone, cpf), profiles:profiles!responsible_technician_id(full_name), created_by:profiles!created_by_id(full_name), finalized_by:profiles!finalized_by_id(full_name), delivered_by:profiles!delivered_by_id(full_name)')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single service order details with its parts
router.get("/:id", async (req, res) => {
  try {
    const { data: os, error: osError } = await supabase
      .from('service_orders')
      .select('*, customers(*), profiles:profiles!responsible_technician_id(full_name), created_by:profiles!created_by_id(full_name), finalized_by:profiles!finalized_by_id(full_name), delivered_by:profiles!delivered_by_id(full_name)')
      .eq('id', req.params.id)
      .single();

    if (osError || !os) {
      return res.status(404).json({ error: osError?.message || "Ordem de Serviço não encontrada" });
    }

    // Fetch related parts
    const { data: parts, error: partsError } = await supabase
      .from('service_order_parts')
      .select('*')
      .eq('os_id', req.params.id);

    res.json({
      ...os,
      parts: parts || []
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new Service Order (OS)
router.post("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('service_orders')
      .insert([req.body])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Service Order (with automatic stock deduction on in_progress)
router.patch("/:id", async (req, res) => {
  try {
    const { status, finalized_by_id, delivered_by_id } = req.body;

    // 1. Get the current status and fields of the OS before update
    const { data: currentOs } = await supabase
      .from('service_orders')
      .select('status, finalized_by_id, delivered_by_id, unit_id, os_number, labor_value, parts_value, device_brand, device_model')
      .eq('id', req.params.id)
      .single();

    // 1.1 Validate critical transitions
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

    // 2. Update the OS
    const { data: updatedOs, error } = await supabase
      .from('service_orders')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ error: error.message });

    // 3. Handle stock deduction on transition to 'in_progress'
    if (status === 'in_progress' && currentOs?.status !== 'in_progress') {
      const { data: osParts } = await supabase
        .from('service_order_parts')
        .select('inventory_item_id, quantity')
        .eq('os_id', req.params.id);

      if (osParts && osParts.length > 0) {
        for (const part of osParts) {
          if (part.inventory_item_id && part.quantity > 0) {
            // Fetch current quantity in devices stock
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

    res.json(updatedOs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Service Order
router.delete("/:id", async (req, res) => {
  try {
    const { error } = await supabase
      .from('service_orders')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sub-routes: Add part to OS
router.post("/:id/parts", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('service_order_parts')
      .insert([{ ...req.body, os_id: req.params.id }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Recalculate OS values
    await updateOsPartsValue(req.params.id);

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sub-routes: Delete part from OS
router.delete("/:id/parts/:partId", async (req, res) => {
  try {
    const { error } = await supabase
      .from('service_order_parts')
      .delete()
      .eq('id', req.params.partId);

    if (error) return res.status(500).json({ error: error.message });

    // Recalculate OS values
    await updateOsPartsValue(req.params.id);

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send WhatsApp OS Status Notification Trigger
router.post("/:id/notify", async (req, res) => {
  try {
    const { templateType } = req.body; // 'entry', 'budget', 'ready'

    // Fetch OS with customer details
    const { data: os, error } = await supabase
      .from('service_orders')
      .select('*, customers(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !os || !os.customers) {
      return res.status(444).json({ error: "OS ou Cliente inválido para notificações" });
    }

    // Fetch store details
    const { data: store } = await supabase
      .from('stores')
      .select('*')
      .eq('id', os.unit_id)
      .single();

    // Get an active WhatsApp automation channel
    const { data: channels } = await supabase
      .from('automation_channels')
      .select('*')
      .eq('status', 'connected')
      .limit(1);

    if (!channels || channels.length === 0) {
      return res.status(400).json({ error: "Nenhum canal do WhatsApp conectado no momento." });
    }

    const instance = channels[0].instance_name;
    let cleanPhone = os.customers.phone.replace(/\D/g, '');
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = `55${cleanPhone}`;
    }
    const remoteJid = `${cleanPhone}@s.whatsapp.net`;

    const numberStr = String(os.os_number).padStart(4, '0');
    const laborStr = Number(os.labor_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const partsStr = Number(os.parts_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const totalStr = Number(os.labor_value + os.parts_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const cleanBrand = (os.device_brand || '').trim();
    const cleanModel = (os.device_model || '').trim();
    let deviceNameStr = `${cleanBrand === '-' ? '' : cleanBrand} ${cleanModel === '-' ? '' : cleanModel}`.trim();
    if (!deviceNameStr) {
      deviceNameStr = os.device_category === 'notebook' ? 'Notebook' : os.device_category === 'desktop' ? 'Computador PC' : 'Equipamento';
    }

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
      if (store?.os_entry_template) {
        messageText = fillTemplate(store.os_entry_template, variables);
      } else {
        messageText = `🛠️ *MDR Informática & Celulares - Ordem de Serviço #${numberStr}* 🛠️\n\n` +
          `Olá *${os.customers.name}*!\n\n` +
          `Registramos com sucesso a entrada do seu equipamento em nossa assistência técnica.\n\n` +
          `💻 *Aparelho:* ${deviceNameStr}\n` +
          `📝 *Problema Relatado:* ${os.reported_issue}\n` +
          `📋 *Acessórios:* ${os.accessories_left ? os.accessories_left.join(', ') : 'Nenhum'}\n\n` +
          `Nosso técnico já está avaliando seu dispositivo. Enviaremos o orçamento completo por aqui em breve!`;
      }
    } else if (templateType === 'budget') {
      if (store?.os_budget_template) {
        messageText = fillTemplate(store.os_budget_template, variables);
      } else {
        messageText = `📊 *MDR Informática & Celulares - Orçamento OS #${numberStr}* 📊\n\n` +
          `Olá *${os.customers.name}*!\n\n` +
          `O diagnóstico técnico do seu *${deviceNameStr}* foi concluído.\n\n` +
          `🔧 *Peças necessárias:* ${partsStr}\n` +
          `👨‍🔧 *Mão de obra:* ${laborStr}\n` +
          `💰 *Valor Total:* *${totalStr}*\n\n` +
          `*Garantia:* ${os.warranty_period || 90} dias após a conclusão.\n\n` +
          `Responda a esta mensagem aprovando o conserto para iniciarmos a execução imediata!`;
      }
    } else if (templateType === 'ready') {
      if (store?.os_ready_template) {
        messageText = fillTemplate(store.os_ready_template, variables);
      } else {
        messageText = `🎉 *SEU EQUIPAMENTO ESTÁ PRONTO! - OS #${numberStr}* 🎉\n\n` +
          `Olá *${os.customers.name}*!\n\n` +
          `Temos ótimas notícias! O conserto do seu *${deviceNameStr}* foi finalizado e todos os testes de qualidade foram aprovados.\n\n` +
          `💵 *Valor Final:* *${totalStr}*\n\n` +
          `O aparelho já está pronto para retirada em nossa loja. Agradecemos a preferência!`;
      }
    } else {
      return res.status(400).json({ error: "Template de notificação inválido" });
    }

    // 3. Dispatch to n8n Webhook
    const n8nWebhookUrl = `${process.env.N8N_API_URL || 'https://n8n.mdrinformaticaecelulares.com.br'}/webhook/os-status-alert`;
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
      const errText = await response.text();
      console.warn('Failed to notify OS via n8n, falling back to direct send:', errText);
      // Fallback: send directly through Evolution API using CRM's endpoint
      const fallbackUrl = `${req.protocol}://${req.get('host')}/api/chat/send`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName: instance,
          remoteJid: remoteJid,
          text: messageText
        })
      });
      if (!fallbackRes.ok) {
        throw new Error("Erro ao disparar mensagem pela Evolution API (e fallback falhou)");
      }
    }

    res.json({ success: true, message: "Mensagem de status enviada com sucesso!" });
  } catch (err: any) {
    console.error('WhatsApp notify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sub-routes: Get outsourced order details for a specific OS
router.get("/:id/outsource", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('outsourced_orders')
      .select('*')
      .eq('os_id', req.params.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sub-routes: Get all outsourced orders (for the global outsourcing panel)
router.get("/global/outsourced", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('outsourced_orders')
      .select('*, service_orders(*, customers(name, phone))')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sub-routes: Outsource an OS
router.post("/:id/outsource", async (req, res) => {
  try {
    const { partner_shop_name, partner_technician_name, external_cost, tracking_code, notes } = req.body;
    
    // Create outsourced record
    const { data, error } = await supabase
      .from('outsourced_orders')
      .insert([{
        os_id: req.params.id,
        partner_shop_name,
        partner_technician_name,
        external_cost: Number(external_cost) || 0,
        tracking_code,
        notes,
        external_status: 'sent'
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sub-routes: Update outsourced order details
router.patch("/:id/outsource/:outsourceId", async (req, res) => {
  try {
    const { external_status, partner_shop_name, partner_technician_name, external_cost, tracking_code, notes } = req.body;
    
    const updateData: any = {};
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
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sub-routes: Delete/Cancel outsourced record
router.delete("/:id/outsource/:outsourceId", async (req, res) => {
  try {
    const { error } = await supabase
      .from('outsourced_orders')
      .delete()
      .eq('id', req.params.outsourceId);

    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
