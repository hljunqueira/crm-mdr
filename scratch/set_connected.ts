import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setConnected() {
  const { error } = await supabase
    .from('automation_channels')
    .update({ status: 'connected', updated_at: new Date().toISOString() })
    .eq('instance_name', 'whatsapp_mdr_arroio');

  if (error) {
    console.error('Error updating status:', error);
  } else {
    console.log('Successfully updated status to connected in Supabase!');
  }
}

setConnected();
