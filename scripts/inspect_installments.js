import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching a single row or columns from installments table...');
  const { data, error } = await supabase
    .from('installments')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Installments fetch error:', error);
  } else {
    console.log('Columns in installments:', data.length > 0 ? Object.keys(data[0]) : 'No rows found');
  }

  // Let's also check if there are any installments at all in the database
  const { count, error: countError } = await supabase
    .from('installments')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.error('Count Error:', countError);
  } else {
    console.log('Total installments count in DB:', count);
  }
}

run();
