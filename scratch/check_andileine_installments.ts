import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const customerId = '5e75232c-fdcb-4ed1-bce6-4bacd044ab02'; // Andileine Ribeiro Gaspar

  const { data: installments, error } = await supabase
    .from("installments")
    .select(`
      *,
      sales!inner (
        customer_id,
        device_model_manual
      )
    `)
    .eq("sales.customer_id", customerId)
    .order("installment_number", { ascending: true });

  if (error) {
    console.error("Error fetching installments:", error);
    return;
  }

  console.log("Installments:");
  for (const inst of installments || []) {
    console.log(`Installment #${inst.installment_number}:`);
    console.log(`  ID: ${inst.id}`);
    console.log(`  Value: ${inst.value}`);
    console.log(`  Status: ${inst.status}`);
    console.log(`  Due Date: ${inst.due_date}`);
    console.log(`  Asaas Invoice URL: "${inst.asaas_invoice_url}"`);
    console.log(`  Asaas Payment ID: "${inst.asaas_payment_id}"`);
  }
}

run();
