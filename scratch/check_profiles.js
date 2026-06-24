import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('Profiles:', profiles.map(p => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    role: p.role,
    unit_id: p.unit_id,
    store_id: p.store_id
  })));
}

run();
