import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.mdrinformaticaecelulares.com.br';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const arroioStoreId = 'b2b1f71d-0471-49a1-b151-865ccc3cd627';
  
  console.log('Updating devices with store_id = null to', arroioStoreId);
  const { data, error } = await supabase
    .from('devices')
    .update({ store_id: arroioStoreId })
    .is('store_id', null)
    .select();

  if (error) {
    console.error('Error updating devices:', error);
  } else {
    console.log('Updated devices:', data);
  }
}

run();
