import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { db } from "../db/connection.js";
import { partners, syncQueue } from "../db/schema.js";
import { eq } from "drizzle-orm";
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

// Get all partners
router.get("/", async (req, res) => {
  if (useSupabase(req)) {
    const { unit_id, all } = req.query;
    let query = supabase.from('partners').select('*');
    if (all !== 'true') {
      query = query.eq('active', true);
    }
    if (unit_id && unit_id !== 'all') {
      query = query.or(`unit_id.eq.${unit_id},unit_id.is.null`);
    }
    const { data, error } = await query.order('name');
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  // SQLite fallback
  try {
    const result = await db.select().from(partners).orderBy(partners.name);
    const formatted = result.map(p => ({
      id: p.id,
      name: p.name,
      cnpj: p.cnpj,
      phone: p.phone,
      email: p.email,
      address: p.address,
      commission_rate: p.commissionRate,
      created_at: p.createdAt
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create partner
router.post("/", async (req, res) => {
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('partners')
      .insert([req.body])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // SQLite fallback
  try {
    const id = req.body.id || crypto.randomUUID();
    const newPartner: any = {
      id,
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };
    
    for (const key of Object.keys(req.body)) {
      const newKey = snakeToCamel(key);
      if (newKey === 'commissionRate') newPartner.commissionRate = Number(req.body[key] || 0);
      else newPartner[newKey] = req.body[key];
    }

    await db.insert(partners).values(newPartner);

    const pgPayload: any = {};
    for (const k of Object.keys(newPartner)) {
      pgPayload[camelToSnake(k)] = newPartner[k];
    }

    await db.insert(syncQueue).values({
      tableName: 'partners',
      action: 'INSERT',
      recordId: id,
      payload: JSON.stringify(pgPayload)
    });

    res.status(201).json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update partner
router.patch("/:id", async (req, res) => {
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('partners')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ error: error.message });
    return res.json(data);
  }

  // SQLite fallback
  try {
    const updateData: any = {};
    for (const key of Object.keys(req.body)) {
      const camelKey = snakeToCamel(key);
      if (camelKey === 'commissionRate') updateData.commissionRate = Number(req.body[key] || 0);
      else updateData[camelKey] = req.body[key];
    }
    updateData.syncStatus = 'pending_update';
    updateData.updatedAt = new Date().toISOString();

    await db.update(partners).set(updateData).where(eq(partners.id, req.params.id));

    const [updatedPartner] = await db.select().from(partners).where(eq(partners.id, req.params.id)).limit(1);
    if (!updatedPartner) return res.status(404).json({ error: "Parceiro não encontrado" });

    const pgPayload: any = {};
    for (const k of Object.keys(updatedPartner)) {
      pgPayload[camelToSnake(k)] = (updatedPartner as any)[k];
    }

    await db.insert(syncQueue).values({
      tableName: 'partners',
      action: 'UPDATE',
      recordId: req.params.id,
      payload: JSON.stringify(pgPayload)
    });

    res.json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete partner
router.delete("/:id", async (req, res) => {
  if (useSupabase(req)) {
    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).send();
  }

  // SQLite fallback
  try {
    const [oldPartner] = await db.select().from(partners).where(eq(partners.id, req.params.id)).limit(1);
    if (!oldPartner) return res.status(404).json({ error: "Parceiro não encontrado" });

    await db.delete(partners).where(eq(partners.id, req.params.id));

    await db.insert(syncQueue).values({
      tableName: 'partners',
      action: 'DELETE',
      recordId: req.params.id,
      payload: JSON.stringify({ id: req.params.id })
    });

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
