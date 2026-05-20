import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Fetching single customer to inspect columns...');
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching customer:', error);
    return;
  }

  console.log('Columns in customers table:');
  if (customers && customers.length > 0) {
    console.log(Object.keys(customers[0]));
    console.log('Sample data:', customers[0]);
  } else {
    console.log('No customers found to inspect.');
  }

  console.log('\nFetching profiles to inspect roles...');
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*');

  if (pError) {
    console.error('Error fetching profiles:', pError);
    return;
  }

  console.log('Profiles found:', profiles.length);
  profiles.forEach(p => {
    console.log(`- ID: ${p.id}, Name: ${p.full_name}, Role: ${p.role}, Active: ${p.active}`);
  });
}

run();
