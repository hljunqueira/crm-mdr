import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log('Fetching connected channels...');
  const { data: channels, error } = await supabase
    .from('automation_channels')
    .select('*')
    .eq('status', 'connected')
    .limit(1);

  console.log('Channels:', channels);
  if (error) {
    console.error('Error fetching channels:', error);
  }
}

run();
