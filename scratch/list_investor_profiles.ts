import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: quotas } = await supabase.from('investor_quotas').select('profile_id');
  const { data: devices } = await supabase.from('devices').select('investor_id').not('investor_id', 'is', null);
  const { data: purchases } = await supabase.from('receivable_purchases').select('profile_id');

  const profileIds = new Set<string>();
  quotas?.forEach(q => profileIds.add(q.profile_id));
  devices?.forEach(d => profileIds.add(d.investor_id));
  purchases?.forEach(p => profileIds.add(p.profile_id));

  console.log('All investor profile IDs found in DB:', Array.from(profileIds));
}

run();
