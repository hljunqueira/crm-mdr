import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const ID = 'e2014af3-ca2f-466b-b2c3-56e6c6113990';
const CORRECT_INSTANCE_NAME = 'MDR ARROIO';

async function run() {
  console.log(`Fixing instance_name to "${CORRECT_INSTANCE_NAME}" for ID "${ID}"...`);

  console.log('Updating automation_channels...');
  const { data: autoData, error: autoErr } = await supabase
    .from('automation_channels')
    .update({ instance_name: CORRECT_INSTANCE_NAME, status: 'connected' })
    .eq('id', ID)
    .select();

  if (autoErr) {
    console.error('Error updating automation_channels:', autoErr);
  } else {
    console.log('Successfully updated automation_channels:', autoData[0]);
  }

  console.log('Updating legacy channels...');
  const { data: legacyData, error: legacyErr } = await supabase
    .from('channels')
    .update({ instance_name: CORRECT_INSTANCE_NAME, status: 'connected' })
    .eq('id', ID)
    .select();

  if (legacyErr) {
    console.error('Error updating legacy channel:', legacyErr);
  } else {
    console.log('Successfully updated legacy channel:', legacyData[0]);
  }
}

run();
