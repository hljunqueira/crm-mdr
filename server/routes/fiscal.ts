import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { db } from "../db/connection.js";
import { invoices, stores } from "../db/schema.js";
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

function mapLocalToCloud(tableName: string, data: any): any {
  const result: any = {};
  for (const k of Object.keys(data)) {
    let pgKey = camelToSnake(k);
    if (k === 'storeId') pgKey = 'store_id';
    else if (k === 'fiscalApiToken') pgKey = 'fiscal_api_token';
    else if (k === 'fiscalEnvironment') pgKey = 'fiscal_environment';
    else if (k === 'fiscalGateway') pgKey = 'fiscal_gateway';
    result[pgKey] = data[k];
  }
  return result;
}

// Get all invoices (optionally filtered by store_id)
router.get("/", async (req, res) => {
  if (useSupabase(req)) {
    const { store_id } = req.query;
    let query = supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (store_id) {
      query = query.eq('store_id', store_id);
    }
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  }

  // SQLite fallback
  try {
    const list = await db.select().from(invoices).orderBy(invoices.createdAt);
    const formatted = list.map(inv => ({
      id: inv.id,
      store_id: inv.storeId,
      number: inv.number,
      series: inv.series,
      type: inv.type,
      status: inv.status,
      xml: inv.xml,
      pdf: inv.pdf,
      created_at: inv.createdAt
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create new invoice
router.post("/", async (req, res) => {
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('invoices')
      .insert([req.body])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  // SQLite fallback
  try {
    const id = req.body.id || crypto.randomUUID();
    const newInvoice: any = {
      id,
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };
    
    for (const key of Object.keys(req.body)) {
      const camelKey = snakeToCamel(key);
      if (camelKey === 'storeId') newInvoice.storeId = req.body[key];
      else newInvoice[camelKey] = req.body[key];
    }

    await db.insert(invoices).values(newInvoice);

    const pgPayload = mapLocalToCloud('invoices', newInvoice);
    // syncQueue insert removed (Supabase native mode)

    res.status(201).json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update invoice
router.patch("/:id", async (req, res) => {
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('invoices')
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
      if (camelKey === 'storeId') updateData.storeId = req.body[key];
      else updateData[camelKey] = req.body[key];
    }
    updateData.syncStatus = 'pending_update';
    updateData.updatedAt = new Date().toISOString();

    await db.update(invoices).set(updateData).where(eq(invoices.id, req.params.id));

    const [updatedInvoice] = await db.select().from(invoices).where(eq(invoices.id, req.params.id)).limit(1);
    if (!updatedInvoice) return res.status(404).json({ error: "Nota Fiscal não encontrada" });

    const pgPayload = mapLocalToCloud('invoices', updatedInvoice);
    // syncQueue insert removed (Supabase native mode)

    res.json(pgPayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get store fiscal config
router.get("/config/:storeId", async (req, res) => {
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('stores')
      .select('cnpj, fiscal_api_token, fiscal_environment, fiscal_gateway')
      .eq('id', req.params.storeId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Configuração não encontrada para a unidade" });
    }
    return res.json(data);
  }

  // SQLite fallback
  try {
    const [store] = await db.select().from(stores).where(eq(stores.id, req.params.storeId)).limit(1);
    if (!store) {
      return res.status(404).json({ error: "Configuração não encontrada para a unidade" });
    }
    res.json({
      cnpj: store.cnpj,
      fiscal_api_token: store.fiscalApiToken,
      fiscal_environment: store.fiscalEnvironment,
      fiscal_gateway: store.fiscalGateway
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save store fiscal config
router.post("/config/:storeId", async (req, res) => {
  const { cnpj, fiscal_api_token, fiscal_environment, fiscal_gateway } = req.body;
  
  if (useSupabase(req)) {
    const { data, error } = await supabase
      .from('stores')
      .update({
        cnpj,
        fiscal_api_token,
        fiscal_environment,
        fiscal_gateway
      })
      .eq('id', req.params.storeId)
      .select('cnpj, fiscal_api_token, fiscal_environment, fiscal_gateway')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // SQLite fallback
  try {
    const [store] = await db.select().from(stores).where(eq(stores.id, req.params.storeId)).limit(1);
    if (!store) {
      return res.status(404).json({ error: "Unidade não encontrada" });
    }

    const updateData = {
      cnpj,
      fiscalApiToken: fiscal_api_token,
      fiscalEnvironment: fiscal_environment,
      fiscalGateway: fiscal_gateway,
      syncStatus: 'pending_update',
      updatedAt: new Date().toISOString()
    };

    await db.update(stores).set(updateData).where(eq(stores.id, req.params.storeId));

    const [updatedStore] = await db.select().from(stores).where(eq(stores.id, req.params.storeId)).limit(1);

    const pgPayload = mapLocalToCloud('stores', updatedStore);
    // syncQueue insert removed (Supabase native mode)

    res.json({
      cnpj: updatedStore.cnpj,
      fiscal_api_token: updatedStore.fiscalApiToken,
      fiscal_environment: updatedStore.fiscalEnvironment,
      fiscal_gateway: updatedStore.fiscalGateway
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
