import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get all customers
router.get("/", async (req, res) => {
  const { unit_id } = req.query;
  let query = supabase.from('customers').select('*');
  
  if (unit_id && unit_id !== 'all') {
    query = query.eq('unit_id', unit_id);
  }

  const { data, error } = await query.order('name');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create customer
router.post("/", async (req, res) => {
  const { phone, unit_id } = req.body;
  if (phone) {
    const cleanNewPhone = phone.replace(/\D/g, '');
    if (cleanNewPhone) {
      let query = supabase
        .from('customers')
        .select('id, phone');

      if (unit_id) {
        query = query.eq('unit_id', unit_id);
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

  const { data, error } = await supabase
    .from('customers')
    .insert([req.body])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update customer
router.patch("/:id", async (req, res) => {
  const { phone, unit_id } = req.body;
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

  const { data, error } = await supabase
    .from('customers')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// Delete customer
router.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

// Get SCR Bacen (Direct Data) report for a specific customer
router.get("/:id/bacen", async (req, res) => {
  try {
    // 1. Get customer's CPF
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

    // 2. Query Direct Data API
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

    // If it is a CNPJ (14 digits), query WDAPI
    if (cleanCpf.length === 14) {
      try {
        const response = await fetch(`https://wd.api.br/v1/cnpj/${cleanCpf}`);
        if (!response.ok) {
          throw new Error(`WDAPI retornou HTTP ${response.status}`);
        }
        const data = await response.json();
        const responseData = { isCNPJ: true, cnpj_data: data };

        // Save to credit_queries_history
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

    // Save to credit_queries_history
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
