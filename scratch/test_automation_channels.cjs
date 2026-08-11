const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== CHECKING AUTOMATION_CHANNELS IN SUPABASE ===");

  const { data: channels, error } = await supabase
    .from('automation_channels')
    .select('*');

  console.log("Channels:", channels, "Error:", error);

  // Check n8n webhook URL
  console.log("N8N_BILLING_WEBHOOK_URL:", process.env.N8N_BILLING_WEBHOOK_URL);
  console.log("N8N_API_URL:", process.env.N8N_API_URL);
  console.log("EVOLUTION_API_URL:", process.env.EVOLUTION_API_URL);
  console.log("EVOLUTION_API_KEY:", process.env.EVOLUTION_API_KEY);
}

run().catch(console.error);
