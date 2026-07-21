import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { db } from "../db/connection.js";
import { inventoryAudits, inventoryAuditItems, profiles, devices, syncQueue } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
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
    if (k === 'storeId') pgKey = 'store_id';
    else if (k === 'createdBy') pgKey = 'created_by';
    else if (k === 'completedAt') pgKey = 'completed_at';
    else if (k === 'totalCostDiscrepancy') pgKey = 'total_cost_discrepancy';
    else if (k === 'auditId') pgKey = 'audit_id';
    else if (k === 'deviceId') pgKey = 'device_id';
    else if (k === 'systemQuantity') pgKey = 'system_quantity';
    else if (k === 'physicalQuantity') pgKey = 'physical_quantity';
    else if (k === 'costPrice') pgKey = 'cost_price';
    else if (k === 'salePrice') pgKey = 'sale_price';
    result[pgKey] = data[k];
  }
  return result;
}

// 1. GET /api/inventory-audits - Histórico de Auditorias
router.get("/", async (req, res) => {
  const { store_id } = req.query;

  if (useSupabase(req)) {
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
          const { data: profilesData, error: profError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", createdByIds);
          
          if (!profError && profilesData) {
            data.forEach(item => {
              const profile = profilesData.find(p => p.id === item.created_by);
              item.profiles = profile ? { full_name: profile.full_name } : null;
            });
          }
        }
      }
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    const list = await db.select().from(inventoryAudits).orderBy(desc(inventoryAudits.createdAt));
    const formatted = [];
    for (const item of list) {
      const [openedProfile] = await db.select().from(profiles).where(eq(profiles.id, item.createdBy || '')).limit(1);
      formatted.push({
        id: item.id,
        store_id: item.storeId,
        created_by: item.createdBy,
        status: item.status,
        completed_at: item.completedAt,
        total_cost_discrepancy: item.totalCostDiscrepancy,
        created_at: item.createdAt,
        profiles: openedProfile ? { full_name: openedProfile.fullName } : null
      });
    }
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/inventory-audits/active
router.get("/active", async (req, res) => {
  const { store_id } = req.query;
  if (!store_id) {
    return res.status(400).json({ error: "store_id é obrigatório." });
  }

  if (useSupabase(req)) {
    try {
      const { data, error } = await supabase
        .from("inventory_audits")
        .select("*, stores(name)")
        .eq("store_id", store_id)
        .eq("status", "in_progress")
        .maybeSingle();

      if (error) throw error;

      if (data && data.created_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.created_by)
          .maybeSingle();
        data.profiles = profile || null;
      }
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    const [audit] = await db.select().from(inventoryAudits).where(and(eq(inventoryAudits.storeId, store_id as string), eq(inventoryAudits.status, 'in_progress'))).limit(1);
    if (!audit) return res.json(null);

    const [profile] = await db.select().from(profiles).where(eq(profiles.id, audit.createdBy || '')).limit(1);
    res.json({
      id: audit.id,
      store_id: audit.storeId,
      created_by: audit.createdBy,
      status: audit.status,
      created_at: audit.createdAt,
      profiles: profile ? { full_name: profile.fullName } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/inventory-audits - Iniciar nova auditoria
router.post("/", async (req, res) => {
  const { store_id, created_by } = req.body;

  if (!store_id || !created_by) {
    return res.status(400).json({ error: "store_id e created_by são obrigatórios." });
  }

  if (useSupabase(req)) {
    try {
      const { data: active } = await supabase
        .from("inventory_audits")
        .select("id")
        .eq("store_id", store_id)
        .eq("status", "in_progress")
        .maybeSingle();

      if (active) {
        return res.status(400).json({ error: "Já existe uma auditoria em andamento para esta loja." });
      }

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
      return res.status(201).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    const [active] = await db.select().from(inventoryAudits).where(and(eq(inventoryAudits.storeId, store_id), eq(inventoryAudits.status, 'in_progress'))).limit(1);
    if (active) return res.status(400).json({ error: "Já existe uma auditoria em andamento para esta loja." });

    const id = crypto.randomUUID();
    const newAudit = {
      id,
      storeId: store_id,
      createdBy: created_by,
      status: "in_progress",
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };

    await db.insert(inventoryAudits).values(newAudit);

    const pgPayload = mapLocalToCloud('inventory_audits', newAudit);
    await db.insert(syncQueue).values({
      tableName: 'inventory_audits',
      action: 'INSERT',
      recordId: id,
      payload: JSON.stringify(pgPayload)
    });

    res.status(201).json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. GET /api/inventory-audits/:id/items
router.get("/:id/items", async (req, res) => {
  const { id } = req.params;

  if (useSupabase(req)) {
    try {
      const { data: audit, error: auditError } = await supabase.from("inventory_audits").select("store_id").eq("id", id).single();
      if (auditError || !audit) return res.status(404).json({ error: "Auditoria não encontrada." });

      const { data: devicesList, error: devError } = await supabase.from("devices").select("*").eq("store_id", audit.store_id).order("model");
      if (devError) throw devError;

      const { data: auditItemsList, error: itemsError } = await supabase.from("inventory_audit_items").select("*").eq("audit_id", id);
      if (itemsError) throw itemsError;

      const merged = devicesList.map((dev) => {
        const auditItem = auditItemsList.find((item) => item.device_id === dev.id);
        return {
          device_id: dev.id,
          model: dev.model,
          brand: dev.brand,
          imei: dev.imei || "",
          barcode: dev.barcode || "",
          category: dev.category || "other",
          system_quantity: auditItem ? auditItem.system_quantity : dev.stock_quantity,
          physical_quantity: auditItem ? auditItem.physical_quantity : null,
          cost_price: auditItem ? Number(auditItem.cost_price) : Number(dev.cost_price) || 0,
          sale_price: auditItem ? Number(auditItem.sale_price) : Number(dev.sale_price) || 0,
          reason: auditItem ? auditItem.reason : "",
          adjusted: auditItem ? auditItem.adjusted : false,
          audit_item_id: auditItem ? auditItem.id : null
        };
      });

      return res.json(merged);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    const [audit] = await db.select().from(inventoryAudits).where(eq(inventoryAudits.id, id)).limit(1);
    if (!audit) return res.status(404).json({ error: "Auditoria não encontrada." });

    const devicesList = await db.select().from(devices).where(eq(devices.storeId, audit.storeId || '')).orderBy(devices.model);
    const auditItemsList = await db.select().from(inventoryAuditItems).where(eq(inventoryAuditItems.auditId, id));

    const merged = devicesList.map((dev) => {
      const auditItem = auditItemsList.find((item) => item.deviceId === dev.id);
      return {
        device_id: dev.id,
        model: dev.model,
        brand: dev.brand,
        imei: dev.imei || "",
        barcode: dev.barcode || "",
        category: dev.category || "other",
        system_quantity: auditItem ? auditItem.systemQuantity : dev.stockQuantity,
        physical_quantity: auditItem ? auditItem.physicalQuantity : null,
        cost_price: auditItem ? Number(auditItem.costPrice) : Number(dev.costPrice) || 0,
        sale_price: auditItem ? Number(auditItem.salePrice) : Number(dev.salePrice) || 0,
        reason: auditItem ? auditItem.reason : "",
        adjusted: auditItem ? auditItem.adjusted : false,
        audit_item_id: auditItem ? auditItem.id : null
      };
    });

    res.json(merged);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. POST /api/inventory-audits/:id/items
router.post("/:id/items", async (req, res) => {
  const { id } = req.params;
  const { device_id, physical_quantity, reason } = req.body;

  if (!device_id || physical_quantity === undefined) {
    return res.status(400).json({ error: "device_id e physical_quantity são obrigatórios." });
  }

  if (useSupabase(req)) {
    try {
      const { data: device, error: devError } = await supabase.from("devices").select("stock_quantity, cost_price, sale_price").eq("id", device_id).single();
      if (devError || !device) return res.status(404).json({ error: "Dispositivo não encontrado no estoque." });

      const { data: existingItem } = await supabase.from("inventory_audit_items").select("id").eq("audit_id", id).eq("device_id", device_id).maybeSingle();

      let result;
      if (existingItem) {
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

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    const [device] = await db.select().from(devices).where(eq(devices.id, device_id)).limit(1);
    if (!device) return res.status(404).json({ error: "Dispositivo não encontrado." });

    const [existingItem] = await db.select().from(inventoryAuditItems).where(and(eq(inventoryAuditItems.auditId, id), eq(inventoryAuditItems.deviceId, device_id))).limit(1);

    let result;
    if (existingItem) {
      await db.update(inventoryAuditItems)
        .set({
          physicalQuantity: Number(physical_quantity),
          reason: reason || null,
          syncStatus: 'pending_update',
          updatedAt: new Date().toISOString()
        })
        .where(eq(inventoryAuditItems.id, existingItem.id));

      const [updated] = await db.select().from(inventoryAuditItems).where(eq(inventoryAuditItems.id, existingItem.id)).limit(1);
      result = mapLocalToCloud('inventory_audit_items', updated);

      await db.insert(syncQueue).values({
        tableName: 'inventory_audit_items',
        action: 'UPDATE',
        recordId: existingItem.id,
        payload: JSON.stringify(result)
      });
    } else {
      const newId = crypto.randomUUID();
      const newAuditItem = {
        id: newId,
        auditId: id,
        deviceId: device_id,
        systemQuantity: device.stockQuantity || 0,
        physicalQuantity: Number(physical_quantity),
        costPrice: Number(device.costPrice || 0),
        salePrice: Number(device.salePrice || 0),
        reason: reason || null,
        syncStatus: 'pending_insert',
        updatedAt: new Date().toISOString()
      };

      await db.insert(inventoryAuditItems).values(newAuditItem);

      result = mapLocalToCloud('inventory_audit_items', newAuditItem);
      await db.insert(syncQueue).values({
        tableName: 'inventory_audit_items',
        action: 'INSERT',
        recordId: newId,
        payload: JSON.stringify(result)
      });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. POST /api/inventory-audits/:id/finalize
router.post("/:id/finalize", async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "user_id é obrigatório." });
  }

  if (useSupabase(req)) {
    try {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user_id).single();
      if (!profile) return res.status(404).json({ error: "Perfil do usuário não encontrado." });
      if (profile.role !== "admin" && profile.role !== "manager") {
        return res.status(403).json({ error: "Apenas administradores ou gerentes podem finalizar auditorias de estoque." });
      }

      const { data: audit } = await supabase.from("inventory_audits").select("*").eq("id", id).single();
      if (!audit) return res.status(404).json({ error: "Auditoria não encontrada." });
      if (audit.status !== "in_progress") return res.status(400).json({ error: "Esta auditoria já foi finalizada ou cancelada." });

      const { data: auditItemsList } = await supabase.from("inventory_audit_items").select("*").eq("audit_id", id);
      let totalCostDiscrepancy = 0;

      for (const item of (auditItemsList || [])) {
        const delta = item.physical_quantity - item.system_quantity;
        const costDiscrepancy = delta * Number(item.cost_price);
        totalCostDiscrepancy += costDiscrepancy;

        const { data: device } = await supabase.from("devices").select("stock_quantity").eq("id", item.device_id).single();
        if (device) {
          const newStock = Math.max(0, device.stock_quantity + delta);
          await supabase.from("devices").update({ stock_quantity: newStock }).eq("id", item.device_id);
        }
        await supabase.from("inventory_audit_items").update({ adjusted: true }).eq("id", item.id);
      }

      const { data: finalizedAudit } = await supabase
        .from("inventory_audits")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          total_cost_discrepancy: totalCostDiscrepancy
        })
        .eq("id", id)
        .select()
        .single();

      return res.json(finalizedAudit);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, user_id)).limit(1);
    if (!profile) return res.status(404).json({ error: "Perfil do usuário não encontrado." });
    if (profile.role !== "admin" && profile.role !== "manager") {
      return res.status(403).json({ error: "Apenas administradores ou gerentes podem finalizar auditorias de estoque." });
    }

    const [audit] = await db.select().from(inventoryAudits).where(eq(inventoryAudits.id, id)).limit(1);
    if (!audit) return res.status(404).json({ error: "Auditoria não encontrada." });
    if (audit.status !== "in_progress") return res.status(400).json({ error: "Esta auditoria já foi finalizada ou cancelada." });

    const auditItemsList = await db.select().from(inventoryAuditItems).where(eq(inventoryAuditItems.auditId, id));
    let totalCostDiscrepancy = 0;

    for (const item of auditItemsList) {
      const delta = (item.physicalQuantity || 0) - (item.systemQuantity || 0);
      const costDiscrepancy = delta * Number(item.costPrice || 0);
      totalCostDiscrepancy += costDiscrepancy;

      const [device] = await db.select().from(devices).where(eq(devices.id, item.deviceId || '')).limit(1);
      if (device) {
        const newStock = Math.max(0, (device.stockQuantity || 0) + delta);
        await db.update(devices).set({ stockQuantity: newStock }).where(eq(devices.id, device.id));
      }
      await db.update(inventoryAuditItems).set({ adjusted: true }).where(eq(inventoryAuditItems.id, item.id));
    }

    await db.update(inventoryAudits)
      .set({
        status: "completed",
        completedAt: new Date().toISOString(),
        totalCostDiscrepancy,
        syncStatus: 'pending_update',
        updatedAt: new Date().toISOString()
      })
      .where(eq(inventoryAudits.id, id));

    const [finalizedAudit] = await db.select().from(inventoryAudits).where(eq(inventoryAudits.id, id)).limit(1);

    const pgPayload = mapLocalToCloud('inventory_audits', finalizedAudit);
    await db.insert(syncQueue).values({
      tableName: 'inventory_audits',
      action: 'UPDATE',
      recordId: id,
      payload: JSON.stringify(pgPayload)
    });

    res.json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. POST /api/inventory-audits/:id/cancel
router.post("/:id/cancel", async (req, res) => {
  const { id } = req.params;

  if (useSupabase(req)) {
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
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    await db.update(inventoryAudits)
      .set({
        status: "cancelled",
        completedAt: new Date().toISOString(),
        syncStatus: 'pending_update',
        updatedAt: new Date().toISOString()
      })
      .where(eq(inventoryAudits.id, id));

    const [updated] = await db.select().from(inventoryAudits).where(eq(inventoryAudits.id, id)).limit(1);

    const pgPayload = mapLocalToCloud('inventory_audits', updated);
    await db.insert(syncQueue).values({
      tableName: 'inventory_audits',
      action: 'UPDATE',
      recordId: id,
      payload: JSON.stringify(pgPayload)
    });

    res.json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. DELETE /api/inventory-audits/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "user_id é obrigatório." });
  }

  if (useSupabase(req)) {
    try {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user_id).single();
      if (!profile) return res.status(404).json({ error: "Perfil do usuário não encontrado." });
      if (profile.role !== "admin") {
        return res.status(403).json({ error: "Apenas administradores podem excluir auditorias de estoque do histórico." });
      }

      const { error } = await supabase.from("inventory_audits").delete().eq("id", id);
      if (error) throw error;
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // SQLite fallback
  try {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, user_id)).limit(1);
    if (!profile) return res.status(404).json({ error: "Perfil do usuário não encontrado." });
    if (profile.role !== "admin") {
      return res.status(403).json({ error: "Apenas administradores podem excluir auditorias de estoque do histórico." });
    }

    await db.delete(inventoryAudits).where(eq(inventoryAudits.id, id));

    await db.insert(syncQueue).values({
      tableName: 'inventory_audits',
      action: 'DELETE',
      recordId: id,
      payload: JSON.stringify({ id })
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
