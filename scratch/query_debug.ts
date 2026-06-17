import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: device, error } = await supabase
    .from('devices')
    .select('id, model, sale_price, trade_in_price')
    .eq('id', '2fb96da1-2e6c-4c58-8f9b-5d834916a0b3')
    .single();

  if (error) {
    console.error('Error fetching device:', error);
    return;
  }

  console.log('--- TARGET DEVICE ---');
  console.log('Model:', device.model);
  console.log('Sale Price (a vista):', device.sale_price);
  console.log('Trade In Price (troca):', device.trade_in_price);
}

run();
