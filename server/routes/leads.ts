import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { db } from "../db/connection.js";
import { leads } from "../db/schema.js";
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

// Get all leads
router.get("/", async (req, res) => {
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // SQLite local fallback
  try {
    const result = await db.select().from(leads).orderBy(leads.createdAt);
    // Format to snake_case for frontend compatibility
    const formatted = result.map(l => ({
      id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      message: l.message,
      source: l.source,
      status: l.status,
      created_at: l.createdAt
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create lead
router.post("/", async (req, res) => {
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('leads')
      .insert([req.body])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // SQLite local fallback
  try {
    const id = req.body.id || crypto.randomUUID();
    const newLead: any = {
      id,
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };
    
    for (const key of Object.keys(req.body)) {
      const newKey = snakeToCamel(key);
      newLead[newKey] = req.body[key];
    }

    await db.insert(leads).values(newLead);

    const pgPayload: any = {};
    for (const k of Object.keys(newLead)) {
      pgPayload[camelToSnake(k)] = newLead[k];
    }

    // syncQueue insert removed (Supabase native mode)

    res.status(201).json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update lead
router.patch("/:id", async (req, res) => {
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('leads')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ error: error.message });
    return res.json(data);
  }

  // SQLite local fallback
  try {
    const updateData: any = {};
    for (const key of Object.keys(req.body)) {
      updateData[snakeToCamel(key)] = req.body[key];
    }
    updateData.syncStatus = 'pending_update';
    updateData.updatedAt = new Date().toISOString();

    await db.update(leads).set(updateData).where(eq(leads.id, req.params.id));

    const [updatedLead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
    if (!updatedLead) return res.status(404).json({ error: "Lead não encontrado" });

    const pgPayload: any = {};
    for (const k of Object.keys(updatedLead)) {
      pgPayload[camelToSnake(k)] = (updatedLead as any)[k];
    }

    // syncQueue insert removed (Supabase native mode)

    res.json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete lead
router.delete("/:id", async (req, res) => {
  if (useSupabase(req)) {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).send();
  }

  // SQLite local fallback
  try {
    const [oldLead] = await db.select().from(leads).where(eq(leads.id, req.params.id)).limit(1);
    if (!oldLead) return res.status(404).json({ error: "Lead não encontrado" });

    await db.delete(leads).where(eq(leads.id, req.params.id));

    // syncQueue insert removed (Supabase native mode)

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
