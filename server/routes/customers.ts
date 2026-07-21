import { Router } from "express";
import { db } from "../db/connection.js";
import { customers, syncQueue, notificationQueue } from "../db/schema.js";
import { eq, or, isNull } from "drizzle-orm";
import crypto from "crypto";
import { supabase } from "../lib/supabase.js";
import { updateAsaasCustomer } from "../services/asaasService.js";

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

const EVOLUTION_URL = 'https://whatsapp.mdrinformaticaecelulares.com.br';
const EVOLUTION_API_KEY = 'MDR_SECRET_TOKEN_2024';

async function notifyMaykonOfAnalysis(customer: any, forceOfflineQueue = false) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': EVOLUTION_API_KEY
  };
  
  const text = `📢 *Novo Cadastro para Análise!*\n\n` +
    `*Cliente:* ${customer.name}\n` +
    `*CPF/CNPJ:* ${customer.cpf || 'Não informado'}\n` +
    `*Telefone:* ${customer.phone || 'Não informado'}\n` +
    `*Cidade/UF:* ${customer.city || 'Não informado'}/${customer.state || 'Não informado'}\n\n` +
    `Por favor, acesse o painel administrativo para avaliar os documentos e realizar a análise de crédito.`;

  const body = {
    number: `5548999035854@s.whatsapp.net`,
    text: text,
    linkPreview: true
  };

  const instance = 'MDR';
  const url = `${EVOLUTION_URL}/message/sendText/${instance}`;

  if (forceOfflineQueue) {
    console.log('[Notify Maykon] Modo offline. Salvando notificação na fila local...');
    try {
      await db.insert(notificationQueue).values({
        url,
        method: 'POST',
        headers: JSON.stringify(headers),
        body: JSON.stringify(body),
        attempts: 0
      });
    } catch (e) {
      console.error('[Notify Maykon] Falha ao enfileirar notificação offline:', e);
    }
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Notify Maykon] Failed: ${response.status}`, errText);
      await db.insert(notificationQueue).values({
        url,
        method: 'POST',
        headers: JSON.stringify(headers),
        body: JSON.stringify(body),
        attempts: 1,
        lastError: `HTTP ${response.status}: ${errText}`
      });
    } else {
      console.log(`[Notify Maykon] Alert sent successfully for customer: ${customer.name}`);
    }
  } catch (error: any) {
    console.error(`[Notify Maykon] Error:`, error);
    try {
      await db.insert(notificationQueue).values({
        url,
        method: 'POST',
        headers: JSON.stringify(headers),
        body: JSON.stringify(body),
        attempts: 1,
        lastError: error.message || 'Erro de rede'
      });
    } catch (e) {
      console.error('[Notify Maykon] Falha ao enfileirar notificação após erro de rede:', e);
    }
  }
}

// Get all customers
router.get("/", async (req, res) => {
  const { unit_id } = req.query;

  try {
    if (useSupabase(req)) {
      let query = supabase
        .from('customers')
        .select('*');
      if (unit_id && unit_id !== 'all') {
        query = query.eq('unit_id', unit_id);
      }
      const { data, error } = await query.order('name');
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }

    let result;
    if (unit_id && unit_id !== 'all') {
      result = await db.select().from(customers).where(eq(customers.storeId, unit_id as string)).orderBy(customers.name);
    } else {
      result = await db.select().from(customers).orderBy(customers.name);
    }
    
    const formattedResult = result.map(c => ({
      id: c.id,
      name: c.name,
      cpf: c.cpf,
      phone: c.phone,
      parent_contact_phone: c.parentContactPhone,
      reference1_name: c.reference1Name,
      reference1_phone: c.reference1Phone,
      reference2_name: c.reference2Name,
      reference2_phone: c.reference2Phone,
      email: c.email,
      address: c.address,
      status: c.status,
      notes: c.notes,
      suggested_down_payment: c.suggestedDownPayment,
      last_payment_date: c.lastPaymentDate,
      approved_for_purchase: c.approvedForPurchase,
      created_at: c.createdAt,
      unit_id: c.storeId,
      document_id_url: c.documentIdUrl,
      document_address_url: c.documentAddressUrl,
      document_income_url: c.documentIncomeUrl,
      classification: c.classification,
      credit_limit: c.creditLimit,
      credit_status: c.creditStatus,
      registration_status: c.registrationStatus,
      responsible_analyst_id: c.responsibleAnalystId,
      needed_credit: c.neededCredit,
      desired_device: c.desiredDevice,
      desired_installment_value: c.desiredInstallmentValue,
      address_number: c.addressNumber,
      neighborhood: c.neighborhood,
      city: c.city,
      state: c.state,
      rg_frente_url: c.rgFrenteUrl,
      rg_verso_url: c.rgVersoUrl,
      cnh_frente_url: c.cnhFrenteUrl,
      cnh_verso_url: c.cnhVersoUrl,
      self_photo_url: c.selfPhotoUrl,
      asaas_customer_id: c.asaasCustomerId,
    }));
    
    res.json(formattedResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create customer
router.post("/", async (req, res) => {
  const { phone, unit_id } = req.body;
  
  try {
    if (useSupabase(req)) {
      if (phone) {
        const cleanNewPhone = phone.replace(/\D/g, '');
        if (cleanNewPhone) {
          let query = supabase
            .from('customers')
            .select('id, phone, unit_id');
          if (unit_id) {
            query = query.eq('unit_id', unit_id);
          }
          const { data: allCustomers } = await query;
          const duplicate = (allCustomers || []).find(c => {
            if (!c.phone) return false;
            const cleanExisting = c.phone.replace(/\D/g, '');
            const sameUnit = !unit_id || c.unit_id === unit_id;
            return cleanExisting === cleanNewPhone && sameUnit;
          });

          if (duplicate) {
            return res.status(400).json({ error: "Este número de telefone já está cadastrado para outro cliente nesta unidade." });
          }
        }
      }

      const id = req.body.id || crypto.randomUUID();
      const pgPayload: any = {};
      const keys = Object.keys(req.body);
      for (const k of keys) {
        pgPayload[k] = req.body[k];
      }
      pgPayload.id = id;
      pgPayload.unit_id = unit_id || req.body.unit_id;
      pgPayload.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('customers')
        .insert([pgPayload])
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      if (req.body.credit_status === 'EM_ANALISE') {
        notifyMaykonOfAnalysis(pgPayload);
      }

      return res.status(201).json(data);
    }

    if (phone) {
      const cleanNewPhone = phone.replace(/\D/g, '');
      if (cleanNewPhone) {
        const allCustomers = await db.select().from(customers);
        const duplicate = allCustomers.find(c => {
          if (!c.phone) return false;
          const cleanExisting = c.phone.replace(/\D/g, '');
          const sameUnit = !unit_id || c.storeId === unit_id;
          return cleanExisting === cleanNewPhone && sameUnit;
        });

        if (duplicate) {
          return res.status(400).json({ error: "Este número de telefone já está cadastrado para outro cliente nesta unidade." });
        }
      }
    }

    const id = req.body.id || crypto.randomUUID();
    
    const newCustomer: any = {
      id,
      syncStatus: 'pending_insert',
      updatedAt: new Date().toISOString()
    };

    const bodyKeys = Object.keys(req.body);
    for (const key of bodyKeys) {
      let newKey = snakeToCamel(key);
      if (key === 'unit_id') newKey = 'storeId';
      
      const val = req.body[key];
      if (val !== undefined) {
        if (typeof val === 'string' && !isNaN(Number(val)) && 
            (key.includes('value') || key.includes('price') || key.includes('amount') || key.includes('limit') || key.includes('fee'))) {
          newCustomer[newKey] = Number(val);
        } else {
          newCustomer[newKey] = val;
        }
      }
    }

    if (req.body.approved_for_purchase !== undefined) {
      newCustomer.approvedForPurchase = !!req.body.approved_for_purchase;
    }

    await db.insert(customers).values(newCustomer);

    const pgPayload: any = {};
    for (const k of Object.keys(newCustomer)) {
      let pgKey = camelToSnake(k);
      if (k === 'storeId') pgKey = 'unit_id';
      pgPayload[pgKey] = newCustomer[k];
    }

    await db.insert(syncQueue).values({
      tableName: 'customers',
      action: 'INSERT',
      recordId: id,
      payload: JSON.stringify(pgPayload),
    });

    if (req.body.credit_status === 'EM_ANALISE') {
      notifyMaykonOfAnalysis(pgPayload, true);
    }

    res.status(201).json(pgPayload);
  } catch (error: any) {
    console.error('[Create Customer Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// Update customer
router.patch("/:id", async (req, res) => {
  const { phone, unit_id } = req.body;
  
  if (useSupabase(req)) {
    if (phone) {
      const cleanNewPhone = phone.replace(/\D/g, '');
      if (cleanNewPhone) {
        let currentUnitId = unit_id;
        if (!currentUnitId) {
          const { data: cust } = await supabase.from('customers').select('unit_id').eq('id', req.params.id).single();
          currentUnitId = cust?.unit_id;
        }

        let query = supabase
          .from('customers')
          .select('id, phone')
          .neq('id', req.params.id);

        if (currentUnitId) {
          query = query.eq('unit_id', currentUnitId);
        }

        const { data: allCustomers, error: fetchError } = await query;

        if (!fetchError && allCustomers) {
          const duplicate = allCustomers.find(c => {
            if (!c.phone) return false;
            const cleanExisting = c.phone.replace(/\D/g, '');
            return cleanExisting === cleanNewPhone;
          });

          if (duplicate) {
            return res.status(400).json({ error: "Este número de telefone já está cadastrado para outro cliente nesta unidade." });
          }
        }
      }
    }

    const { data: oldCustomer } = await supabase
      .from('customers')
      .select('credit_status')
      .eq('id', req.params.id)
      .single();

    const { data, error } = await supabase
      .from('customers')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(404).json({ error: error.message });

    if (data && data.credit_status === 'EM_ANALISE' && oldCustomer?.credit_status !== 'EM_ANALISE') {
      notifyMaykonOfAnalysis(data);
    }

    if (data && data.asaas_customer_id) {
      updateAsaasCustomer(data.asaas_customer_id, {
        name: data.name,
        cpfCnpj: data.cpf,
        phone: data.phone,
        email: data.email,
        address: data.address
      }).catch(err => {
        console.error("[Asaas Sync] Erro ao sincronizar atualização de cliente:", err);
      });
    }

    return res.json(data);
  }

  // Local Offline Update
  try {
    const allCustomers = await db.select().from(customers);
    if (phone) {
      const cleanNewPhone = phone.replace(/\D/g, '');
      if (cleanNewPhone) {
        const duplicate = allCustomers.find(c => {
          if (c.id === req.params.id || !c.phone) return false;
          const cleanExisting = c.phone.replace(/\D/g, '');
          const sameUnit = !unit_id || c.storeId === unit_id;
          return cleanExisting === cleanNewPhone && sameUnit;
        });
        if (duplicate) {
          return res.status(400).json({ error: "Este número de telefone já está cadastrado para outro cliente nesta unidade." });
        }
      }
    }

    const updateData: any = {};
    const bodyKeys = Object.keys(req.body);
    for (const key of bodyKeys) {
      let newKey = snakeToCamel(key);
      if (key === 'unit_id') newKey = 'storeId';
      
      const val = req.body[key];
      if (val !== undefined) {
        if (typeof val === 'string' && !isNaN(Number(val)) && 
            (key.includes('value') || key.includes('price') || key.includes('amount') || key.includes('limit') || key.includes('fee'))) {
          updateData[newKey] = Number(val);
        } else {
          updateData[newKey] = val;
        }
      }
    }
    updateData.syncStatus = 'pending_update';
    updateData.updatedAt = new Date().toISOString();

    const [oldCust] = await db.select().from(customers).where(eq(customers.id, req.params.id)).limit(1);
    if (!oldCust) return res.status(404).json({ error: "Cliente não encontrado" });

    await db.update(customers).set(updateData).where(eq(customers.id, req.params.id));

    const [updatedCust] = await db.select().from(customers).where(eq(customers.id, req.params.id)).limit(1);

    const pgPayload: any = {};
    for (const k of Object.keys(updatedCust)) {
      let pgKey = camelToSnake(k);
      if (k === 'storeId') pgKey = 'unit_id';
      pgPayload[pgKey] = (updatedCust as any)[k];
    }

    await db.insert(syncQueue).values({
      tableName: 'customers',
      action: 'UPDATE',
      recordId: req.params.id,
      payload: JSON.stringify(pgPayload)
    });

    if (req.body.credit_status === 'EM_ANALISE' && oldCust.creditStatus !== 'EM_ANALISE') {
      notifyMaykonOfAnalysis(pgPayload, true);
    }

    res.json(pgPayload);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete customer
router.delete("/:id", async (req, res) => {
  if (useSupabase(req)) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).send();
  }

  // Local Offline Delete
  try {
    const [oldCust] = await db.select().from(customers).where(eq(customers.id, req.params.id)).limit(1);
    if (!oldCust) return res.status(404).json({ error: "Cliente não encontrado" });

    await db.delete(customers).where(eq(customers.id, req.params.id));

    await db.insert(syncQueue).values({
      tableName: 'customers',
      action: 'DELETE',
      recordId: req.params.id,
      payload: JSON.stringify({ id: req.params.id })
    });

    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get SCR Bacen (Direct Data) report for a specific customer
router.get("/:id/bacen", async (req, res) => {
  try {
    const { data: customer, error: dbError } = await supabase
      .from('customers')
      .select('cpf')
      .eq('id', req.params.id)
      .single();

    if (dbError || !customer) {
      return res.status(404).json({ error: "Cliente não encontrado ou CPF inexistente" });
    }

    const cleanCpf = customer.cpf.replace(/\D/g, '');
    const token = process.env.DIRECT_DATA_TOKEN || "E01071B5-B7A5-4950-905A-94C3877E2176";

    const response = await fetch(`https://apiv3.directd.com.br/api/SCRBacen?CPF=${cleanCpf}&Token=${token}`);
    const data = await response.json();

    res.json(data);
  } catch (err: any) {
    console.error('Error fetching SCR Bacen:', err);
    res.status(500).json({ error: err.message });
  }
});

// Query chosen credit services from Direct Data for a specific customer
router.post("/:id/query-credit", async (req, res) => {
  try {
    const { services, performed_by } = req.body;
    if (!Array.isArray(services)) {
      return res.status(400).json({ error: "Parâmetro 'services' inválido" });
    }

    const { data: customer, error: dbError } = await supabase
      .from('customers')
      .select('cpf')
      .eq('id', req.params.id)
      .single();

    if (dbError || !customer) {
      return res.status(404).json({ error: "Cliente não encontrado ou CPF inexistente" });
    }

    const cleanCpf = customer.cpf.replace(/\D/g, '');
    if (!cleanCpf) {
      return res.status(400).json({ error: "Este cliente não possui CPF ou CNPJ cadastrado." });
    }

    if (cleanCpf.length === 14) {
      try {
        const response = await fetch(`https://wd.api.br/v1/cnpj/${cleanCpf}`);
        if (!response.ok) {
          throw new Error(`WDAPI retornou HTTP ${response.status}`);
        }
        const data = await response.json();
        const responseData = { isCNPJ: true, cnpj_data: data };

        await supabase.from('credit_queries_history').insert({
          customer_id: req.params.id,
          query_type: 'CNPJ',
          document: cleanCpf,
          raw_response: responseData,
          performed_by: performed_by || null
        });

        return res.json(responseData);
      } catch (err: any) {
        console.error('Error querying WDAPI:', err);
        return res.status(500).json({ error: `Erro ao consultar a API do CNPJ (WDAPI): ${err.message}` });
      }
    }

    const token = process.env.DIRECT_DATA_TOKEN || "E01071B5-B7A5-4950-905A-94C3877E2176";
    const results: any = {};

    const serviceUrls: Record<string, string> = {
      cadastro: `https://apiv3.directd.com.br/api/CadastroPessoaFisicaPlus?CPF=${cleanCpf}&TOKEN=${token}`,
      score: `https://apiv3.directd.com.br/api/Score?CPF=${cleanCpf}&TOKEN=${token}`,
      bacen: `https://apiv3.directd.com.br/api/SCRBacen?CPF=${cleanCpf}&Token=${token}`,
      protesto: `https://apiv3.directd.com.br/api/ProtestosOnline?CPF=${cleanCpf}&TOKEN=${token}`,
      boavista: `https://apiv3.directd.com.br/api/BoaVistaAcertaCompletoPositivoPF?CPF=${cleanCpf}&TOKEN=${token}`
    };

    const fetchService = async (serviceName: string) => {
      const url = serviceUrls[serviceName];
      if (!url) return;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        results[serviceName] = data;
      } catch (err: any) {
        console.error(`Error querying service ${serviceName}:`, err);
        results[serviceName] = { error: err.message || "Falha na resposta do servidor" };
      }
    };

    const selectedQueries = services.filter(s => serviceUrls[s]);
    await Promise.all(selectedQueries.map(fetchService));

    await supabase.from('credit_queries_history').insert({
      customer_id: req.params.id,
      query_type: 'CPF',
      document: cleanCpf,
      raw_response: results,
      performed_by: performed_by || null
    });

    res.json(results);
  } catch (err: any) {
    console.error('Error querying credit info:', err);
    res.status(500).json({ error: err.message });
  }
});

// List credit queries history for a specific customer
router.get("/:id/credit-queries", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('credit_queries_history')
      .select('*, performed_by(full_name)')
      .eq('customer_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a specific credit query log from history
router.delete("/credit-queries/:queryId", async (req, res) => {
  try {
    const { error } = await supabase
      .from('credit_queries_history')
      .delete()
      .eq('id', req.params.queryId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
