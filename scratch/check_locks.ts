import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://supabase.mdrinformaticaecelulares.com.br';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking sale 1f7a05d2-244a-493a-9b21-8df2c33ee639 details...");
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select('*, customers(name), profiles(full_name)')
    .eq('id', '1f7a05d2-244a-493a-9b21-8df2c33ee639')
    .single();

  if (saleError) {
    console.error("Error fetching sale:", saleError);
  } else {
    console.log("Sale Details:", JSON.stringify(sale, null, 2));
  }

  console.log("\nChecking Arthur Coelho's profile...");
  const { data: arthur, error: arthurError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('full_name', '%arthur%');

  if (arthurError) {
    console.error("Error fetching Arthur's profile:", arthurError);
  } else {
    console.log("Arthur's Profile:", arthur);
  }
}

main();
