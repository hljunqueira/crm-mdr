import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Get all customers
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name');
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create customer
router.post("/", async (req, res) => {
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
    const { services } = req.body;
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

    res.json(results);
  } catch (err: any) {
    console.error('Error querying credit info:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
