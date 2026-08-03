import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkInstallmentsSchema() {
  const { data, error } = await supabase.from('installments').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Columns in installments:', Object.keys(data[0]));
  } else {
    console.log('No data or error:', error);
  }
}

checkInstallmentsSchema();
