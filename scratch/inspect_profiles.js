import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching all user profiles...');
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*');

  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log('Profiles found:', profiles.length);
  profiles.forEach(p => {
    console.log(`- ID: ${p.id}\n  Name: ${p.full_name}\n  Role: ${p.role}\n  Active: ${p.active}\n  Store ID: ${p.store_id}\n`);
  });
}

run();
