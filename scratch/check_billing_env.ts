import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('N8N_BILLING_WEBHOOK_URL:', process.env.N8N_BILLING_WEBHOOK_URL);
  console.log('N8N_API_URL:', process.env.N8N_API_URL);
  console.log('N8N_API_KEY:', process.env.N8N_API_KEY ? 'Present' : 'Not present');
  console.log('PORT:', process.env.PORT);

  // Fetch automation channels
  const { data: channels, error } = await supabase
    .from('automation_channels')
    .select('*');

  if (error) {
    console.error('Error fetching automation channels:', error);
  } else {
    console.log('Automation channels:', channels);
  }
}

run();
