import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// 1. GET /api/inventory-audits - Histórico de Auditorias
router.get("/", async (req, res) => {
  const { store_id } = req.query;
  try {
    let query = supabase
      .from("inventory_audits")
      .select("*, stores(name)")
      .order("created_at", { ascending: false });

    if (store_id && store_id !== "all") {
      query = query.eq("store_id", store_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      const createdByIds = data.map(item => item.created_by).filter(Boolean);
      if (createdByIds.length > 0) {
        const { data: profiles, error: profError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", createdByIds);
        
        if (!profError && profiles) {
          data.forEach(item => {
            const profile = profiles.find(p => p.id === item.created_by);
            item.profiles = profile ? { full_name: profile.full_name } : null;
          });
        }
      }
    }

    res.json(data);
  } catch (error: any) {
    console.error("[InventoryAudits GET] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/inventory-audits/active - Verificar se há auditoria ativa na loja
router.get("/active", async (req, res) => {
  const { store_id } = req.query;
  if (!store_id) {
    return res.status(400).json({ error: "store_id é obrigatório." });
  }
  try {
    const { data, error } = await supabase
      .from("inventory_audits")
      .select("*, stores(name)")
      .eq("store_id", store_id)
      .eq("status", "in_progress")
      .maybeSingle();

    if (error) throw error;

    if (data && data.created_by) {
      const { data: profile, error: profError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.created_by)
        .maybeSingle();
      if (!profError && profile) {
        data.profiles = profile;
      } else {
        data.profiles = null;
      }
    }
    res.json(data);
  } catch (error: any) {
    console.error("[InventoryAudits Active GET] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/inventory-audits - Iniciar nova auditoria
router.post("/", async (req, res) => {
  const { store_id, created_by } = req.body;

  if (!store_id || !created_by) {
    return res.status(400).json({ error: "store_id e created_by são obrigatórios." });
  }

  try {
    // Verificar se já existe uma ativa
    const { data: active } = await supabase
      .from("inventory_audits")
      .select("id")
      .eq("store_id", store_id)
      .eq("status", "in_progress")
      .maybeSingle();

    if (active) {
      return res.status(400).json({ error: "Já existe uma auditoria em andamento para esta loja." });
    }

    // Criar a auditoria
    const { data, error } = await supabase
      .from("inventory_audits")
      .insert({
        store_id,
        created_by,
        status: "in_progress"
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error("[InventoryAudits POST] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

// 4. GET /api/inventory-audits/:id/items - Obter itens e mesclar com produtos da loja
router.get("/:id/items", async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Obter a auditoria para saber a loja
    const { data: audit, error: auditError } = await supabase
      .from("inventory_audits")
      .select("store_id")
      .eq("id", id)
      .single();

    if (auditError || !audit) {
      return res.status(404).json({ error: "Auditoria não encontrada." });
    }

    // 2. Buscar todos os dispositivos dessa loja
    const { data: devices, error: devError } = await supabase
      .from("devices")
      .select("*")
      .eq("store_id", audit.store_id)
      .order("model");

    if (devError) throw devError;

    // 3. Buscar os itens já auditados nesta sessão
    const { data: auditItems, error: itemsError } = await supabase
      .from("inventory_audit_items")
      .select("*")
      .eq("audit_id", id);

    if (itemsError) throw itemsError;

    // 4. Mesclar dispositivos com as contagens
    const merged = devices.map((dev) => {
      const auditItem = auditItems.find((item) => item.device_id === dev.id);
      return {
        device_id: dev.id,
        model: dev.model,
        brand: dev.brand,
        imei: dev.imei || "",
        barcode: dev.barcode || "",
        category: dev.category || "other",
        system_quantity: auditItem ? auditItem.system_quantity : dev.stock_quantity,
        physical_quantity: auditItem ? auditItem.physical_quantity : null, // null significa não contado ainda
        cost_price: auditItem ? Number(auditItem.cost_price) : Number(dev.cost_price) || 0,
        sale_price: auditItem ? Number(auditItem.sale_price) : Number(dev.sale_price) || 0,
        reason: auditItem ? auditItem.reason : "",
        adjusted: auditItem ? auditItem.adjusted : false,
        audit_item_id: auditItem ? auditItem.id : null
      };
    });

    res.json(merged);
  } catch (error: any) {
    console.error("[InventoryAudits Items GET] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

// 5. POST /api/inventory-audits/:id/items - Salvar ou atualizar contagem de um produto
router.post("/:id/items", async (req, res) => {
  const { id } = req.params;
  const { device_id, physical_quantity, reason } = req.body;

  if (!device_id || physical_quantity === undefined) {
    return res.status(400).json({ error: "device_id e physical_quantity são obrigatórios." });
  }

  try {
    // Buscar o produto para pegar o snapshot dos valores e o estoque atual do sistema
    const { data: device, error: devError } = await supabase
      .from("devices")
      .select("stock_quantity, cost_price, sale_price")
      .eq("id", device_id)
      .single();

    if (devError || !device) {
      return res.status(404).json({ error: "Dispositivo não encontrado no estoque." });
    }

    // Verificar se já existe contagem para este produto nesta auditoria
    const { data: existingItem } = await supabase
      .from("inventory_audit_items")
      .select("id")
      .eq("audit_id", id)
      .eq("device_id", device_id)
      .maybeSingle();

    let result;
    if (existingItem) {
      // Atualizar contagem existente
      const { data, error } = await supabase
        .from("inventory_audit_items")
        .update({
          physical_quantity: Number(physical_quantity),
          reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingItem.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Inserir nova contagem gravando snapshots
      const { data, error } = await supabase
        .from("inventory_audit_items")
        .insert({
          audit_id: id,
          device_id,
          system_quantity: device.stock_quantity,
          physical_quantity: Number(physical_quantity),
          cost_price: device.cost_price || 0,
          sale_price: device.sale_price || 0,
          reason: reason || null
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.json(result);
  } catch (error: any) {
    console.error("[InventoryAudits Save Item POST] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

// 6. POST /api/inventory-audits/:id/finalize - Consolidar auditoria e ajustar estoque
router.post("/:id/finalize", async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "user_id é obrigatório." });
  }

  try {
    // 1. Verificar permissão de Admin/Manager
    const { data: profile, error: profError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user_id)
      .single();

    if (profError || !profile) {
      return res.status(404).json({ error: "Perfil do usuário não encontrado." });
    }

    if (profile.role !== "admin" && profile.role !== "manager") {
      return res.status(403).json({ error: "Apenas administradores ou gerentes podem finalizar auditorias de estoque." });
    }

    // 2. Buscar a sessão de auditoria
    const { data: audit, error: auditError } = await supabase
      .from("inventory_audits")
      .select("*")
      .eq("id", id)
      .single();

    if (auditError || !audit) {
      return res.status(404).json({ error: "Auditoria não encontrada." });
    }

    if (audit.status !== "in_progress") {
      return res.status(400).json({ error: "Esta auditoria já foi finalizada ou cancelada." });
    }

    // 3. Buscar os itens contados da auditoria
    const { data: auditItems, error: itemsError } = await supabase
      .from("inventory_audit_items")
      .select("*")
      .eq("audit_id", id);

    if (itemsError) throw itemsError;

    let totalCostDiscrepancy = 0;

    // 4. Executar os ajustes no estoque usando a variação relativa (Delta)
    for (const item of auditItems) {
      const delta = item.physical_quantity - item.system_quantity;
      const costDiscrepancy = delta * Number(item.cost_price);
      totalCostDiscrepancy += costDiscrepancy;

      // Buscar o estoque ATUAL do produto no banco para aplicar o delta
      const { data: device } = await supabase
        .from("devices")
        .select("stock_quantity")
        .eq("id", item.device_id)
        .single();

      if (device) {
        // Nova quantidade física = Estoque atual + variação encontrada
        const newStock = Math.max(0, device.stock_quantity + delta);

        await supabase
          .from("devices")
          .update({ stock_quantity: newStock })
          .eq("id", item.device_id);
      }

      // Marcar item como ajustado
      await supabase
        .from("inventory_audit_items")
        .update({ adjusted: true })
        .eq("id", item.id);
    }

    // 5. Finalizar a sessão de auditoria
    const { data: finalizedAudit, error: finalError } = await supabase
      .from("inventory_audits")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_cost_discrepancy: totalCostDiscrepancy
      })
      .eq("id", id)
      .select()
      .single();

    if (finalError) throw finalError;

    res.json(finalizedAudit);
  } catch (error: any) {
    console.error("[InventoryAudits Finalize] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

// 7. POST /api/inventory-audits/:id/cancel - Cancelar auditoria
router.post("/:id/cancel", async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("inventory_audits")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error("[InventoryAudits Cancel] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
