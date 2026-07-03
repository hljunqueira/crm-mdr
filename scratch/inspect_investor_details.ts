import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');

  console.log(`Total profiles in database: ${profiles?.length || 0}`);
  for (const p of profiles || []) {
    console.log(`- Name: "${p.full_name}" | Role: "${p.role}" | ID: "${p.id}"`);
  }
}

inspect();
