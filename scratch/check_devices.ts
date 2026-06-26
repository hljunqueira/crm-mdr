import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkDevices() {
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error('Error fetching devices:', error);
  } else {
    console.log('Devices sample:', data);
  }
}

checkDevices();
