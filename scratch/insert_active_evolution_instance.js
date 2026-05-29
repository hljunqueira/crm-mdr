import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const INSTANCE_NAME = 'e2014af3-ca2f-466b-b2c3-56e6c6113990';
const UNIT_ID = 'b2b1f71d-0471-49a1-b151-865ccc3cd627'; // MDR ARROIO Store ID

async function run() {
  console.log(`Registering active instance ${INSTANCE_NAME} for unit ${UNIT_ID} in database...`);

  const row = {
    id: INSTANCE_NAME, // It is a valid UUID
    name: 'MDR ARROIO',
    type: 'whatsapp',
    instance_name: INSTANCE_NAME,
    status: 'connected',
    unit_id: UNIT_ID,
    updated_at: new Date().toISOString()
  };

  console.log('Inserting into automation_channels...');
  const { data: autoData, error: autoErr } = await supabase
    .from('automation_channels')
    .upsert(row)
    .select();

  if (autoErr) {
    console.error('Error inserting into automation_channels:', autoErr);
  } else {
    console.log('Successfully inserted into automation_channels:', autoData[0]);
  }

  console.log('Inserting legacy channel...');
  const { data: legacyData, error: legacyErr } = await supabase
    .from('channels')
    .upsert({
      id: INSTANCE_NAME,
      name: 'MDR ARROIO',
      type: 'whatsapp',
      instance_name: INSTANCE_NAME,
      status: 'connected',
      unit_id: UNIT_ID
    })
    .select();

  if (legacyErr) {
    console.error('Error inserting legacy channel:', legacyErr);
  } else {
    console.log('Successfully inserted legacy channel:', legacyData[0]);
  }
}

run();
