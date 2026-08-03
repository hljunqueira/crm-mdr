import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  // Find Giovane customer
  const { data: custs, error: custErr } = await supabase
    .from("customers")
    .select("*")
    .ilike("name", "%giovane%");

  console.log("Giovane customer:", custs);
  if (!custs || custs.length === 0) return;

  const customer = custs[0];

  // Try send-statement logic:
  const { data: installments, error: instErr } = await supabase
    .from("installments")
    .select(`
      *,
      sales!inner (
        customer_id,
        device_model_manual,
        store:stores (
          name,
          phone
        )
      )
    `)
    .eq("sales.customer_id", customer.id)
    .order("due_date", { ascending: true });

  console.log("Installments query result count:", installments?.length);
  console.log("Installments query error:", instErr);

  // Check channel lookup:
  const unitId = customer.unit_id || installments?.[0]?.sales?.store_id;
  console.log("Customer unit_id:", customer.unit_id);
  console.log("Installment sales store_id:", installments?.[0]?.sales?.store_id);
  console.log("Target unitId for channel:", unitId);

  let { data: channels, error: chErr } = await supabase
    .from('automation_channels')
    .select('*')
    .eq('status', 'connected')
    .eq('unit_id', unitId)
    .limit(1);

  console.log("Channels for unitId:", channels, chErr);

  if (!channels || channels.length === 0) {
    const { data: fallbackChannels } = await supabase
      .from('automation_channels')
      .select('*')
      .eq('status', 'connected')
      .limit(1);
    console.log("Fallback channels:", fallbackChannels);
  }
}

run();
