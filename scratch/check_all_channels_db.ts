import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAllChannels() {
  const { data: channels, error } = await supabase.from('automation_channels').select('*');
  console.log('All automation_channels in Supabase:', JSON.stringify(channels, null, 2));
}

checkAllChannels();
