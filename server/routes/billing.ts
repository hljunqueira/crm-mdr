import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// Endpoint to trigger manual/individual billing reminder via n8n
router.post("/send-warning", async (req, res) => {
  try {
    const { installmentId } = req.body;

    if (!installmentId) {
      return res.status(400).json({ error: "O ID da parcela é obrigatório." });
    }

    // 1. Fetch installment details with customer and store context
    const { data: installment, error } = await supabase
      .from("installments")
      .select(`
        *,
        sales (
          device_model,
          imei,
          customer:customers (
            name,
            phone
          ),
          store:stores (
            name,
            phone
          )
        )
      `)
      .eq("id", installmentId)
      .single();

    if (error || !installment) {
      return res.status(404).json({ error: "Parcela não encontrada." });
    }

    const sale = installment.sales;
    const customer = sale?.customer;
    const store = sale?.store;

    if (!customer?.phone) {
      return res.status(400).json({ error: "Cliente não possui telefone cadastrado." });
    }

    // 2. n8n webhook payload
    const n8nPayload = {
      installment_id: installment.id,
      installment_number: installment.number,
      total_installments: installment.total,
      value: installment.value,
      due_date: installment.due_date,
      status: installment.status,
      customer_name: customer.name,
      customer_phone: customer.phone,
      device_model: sale.device_model || "Aparelho Celular",
      device_imei: sale.imei || "Não Informado",
      store_name: store?.name || "MDR Celulares",
      store_phone: store?.phone || ""
    };

    const n8nWebhookUrl = process.env.N8N_BILLING_WEBHOOK_URL || "https://n8n.mdrinformaticaecelulares.com.br/webhook/billing-warning";

    console.log(`[Billing Webhook] Sending payload to n8n:`, n8nPayload);

    // 3. Post to n8n webhook
    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(n8nPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Billing Webhook] n8n responded with error:`, errorText);
      return res.status(502).json({ error: "Falha na comunicação com o n8n." });
    }

    res.json({ success: true, message: "Comando de cobrança enviado para o n8n!" });
  } catch (err: any) {
    console.error("[Billing Webhook] Error triggering billing warning:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
