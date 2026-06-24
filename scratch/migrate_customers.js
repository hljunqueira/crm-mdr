import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const arroioUnitId = 'b2b1f71d-0471-49a1-b151-865ccc3cd627';
  console.log('Migrating customers with NULL unit_id to Arroio unit...');

  const { data, error } = await supabase
    .from('customers')
    .update({ unit_id: arroioUnitId })
    .is('unit_id', null)
    .select();

  if (error) {
    console.error('Migration failed:', error);
    return;
  }

  console.log('Migration successful! Updated customers:', data?.length);
  data?.forEach(c => {
    console.log(`- ${c.name} (${c.id}) -> Unit ID: ${c.unit_id}`);
  });
}

run();
