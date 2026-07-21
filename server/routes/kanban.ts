import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { db } from "../db/connection.js";
import { kanbanColumns, deals, syncQueue, customers, profiles } from "../db/schema.js";
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

// Get columns
router.get("/columns", async (req, res) => {
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('kanban_columns')
      .select('*')
      .order('order_index');
    
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // SQLite local fallback
  try {
    const result = await db.select().from(kanbanColumns).orderBy(kanbanColumns.orderIndex);
    const formatted = result.map(c => ({
      id: c.id,
      title: c.title,
      order_index: c.orderIndex,
      color: c.color,
      created_at: c.createdAt
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get cards (deals)
router.get("/cards", async (req, res) => {
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('deals')
      .select('*, customers(name), profiles(full_name)')
      .order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // SQLite local fallback
  try {
    const result = await db.select({
      id: deals.id,
      columnId: deals.columnId,
      customerId: deals.customerId,
      title: deals.title,
      value: deals.value,
      priority: deals.priority,
      assignedTo: deals.assignedTo,
      notes: deals.notes,
      status: deals.status,
      createdAt: deals.createdAt,
      customerName: customers.name,
      profileFullName: profiles.fullName
    })
    .from(deals)
    .leftJoin(customers, eq(deals.customerId, customers.id))
    .leftJoin(profiles, eq(deals.assignedTo, profiles.id))
    .orderBy(deals.createdAt);

    const formatted = result.map(r => ({
      id: r.id,
      column_id: r.columnId,
      customer_id: r.customerId,
      title: r.title,
      value: r.value,
      priority: r.priority,
      assigned_to: r.assignedTo,
      notes: r.notes,
      status: r.status,
      created_at: r.createdAt,
      customers: r.customerName ? { name: r.customerName } : null,
      profiles: r.profileFullName ? { full_name: r.profileFullName } : null
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create card (deal)
router.post("/cards", async (req, res) => {
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('deals')
      .insert([req.body])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // SQLite local fallback
  try {
    const id = req.body.id || crypto.randomUUID();
    const newDeal: any = {
      id,
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };
    
    for (const key of Object.keys(req.body)) {
      newDeal[snakeToCamel(key)] = req.body[key];
    }

    await db.insert(deals).values(newDeal);

    const pgPayload: any = {};
    for (const k of Object.keys(newDeal)) {
      pgPayload[camelToSnake(k)] = newDeal[k];
    }

    await db.insert(syncQueue).values({
      tableName: 'deals',
      action: 'INSERT',
      recordId: id,
      payload: JSON.stringify(pgPayload)
    });

    res.status(201).json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update card (deal)
router.patch("/cards/:id", async (req, res) => {
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('deals')
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

    await db.update(deals).set(updateData).where(eq(deals.id, req.params.id));

    const [updatedDeal] = await db.select().from(deals).where(eq(deals.id, req.params.id)).limit(1);
    if (!updatedDeal) return res.status(404).json({ error: "Deal não encontrado" });

    const pgPayload: any = {};
    for (const k of Object.keys(updatedDeal)) {
      pgPayload[camelToSnake(k)] = (updatedDeal as any)[k];
    }

    await db.insert(syncQueue).values({
      tableName: 'deals',
      action: 'UPDATE',
      recordId: req.params.id,
      payload: JSON.stringify(pgPayload)
    });

    res.json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete card (deal)
router.delete("/cards/:id", async (req, res) => {
  if (useSupabase(req)) {
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).send();
  }

  // SQLite local fallback
  try {
    const [oldDeal] = await db.select().from(deals).where(eq(deals.id, req.params.id)).limit(1);
    if (!oldDeal) return res.status(404).json({ error: "Deal não encontrado" });

    await db.delete(deals).where(eq(deals.id, req.params.id));

    await db.insert(syncQueue).values({
      tableName: 'deals',
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
