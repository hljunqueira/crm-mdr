import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  const { data: customers } = await supabase.from('customers').select('*').order('name');
  console.log('Total customers in DB:', customers?.length);

  const search = 'TUANNY'.toLowerCase().trim();
  const filtered = customers.filter(c => {
    try {
      return c.name.toLowerCase().includes(search) ||
        (c.cpf && c.cpf.replace(/\D/g, '').includes(search.replace(/\D/g, '')));
    } catch (e) {
      console.log('Error filtering customer:', c.id, e.message);
      return false;
    }
  });

  console.log('Filtered customers matching tuanny:', filtered.map(f => f.name));
}

run();
