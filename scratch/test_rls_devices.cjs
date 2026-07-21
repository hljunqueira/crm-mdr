const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL:", supabaseUrl);

async function test() {
  if (!supabaseUrl || !anonKey) {
    console.error("Missing SUPABASE URL or ANON KEY in env");
    return;
  }

  // 1. Test with anon key
  console.log("\n--- Testing with Anon Key ---");
  const supabaseAnon = createClient(supabaseUrl, anonKey);
  const { data: dataAnon, error: errorAnon } = await supabaseAnon.from('devices').select('id, model, status, stock_quantity').limit(5);
  if (errorAnon) {
    console.error("Anon select error:", errorAnon);
  } else {
    console.log(`Anon select successful. Found ${dataAnon.length} devices:`, dataAnon);
  }

  // Try to insert a dummy device with anon key
  const { data: insertAnon, error: insertAnonErr } = await supabaseAnon.from('devices').insert([{
    model: 'Test Device Anon',
    brand: 'Test',
    condition: 'new',
    status: 'available',
    stock_quantity: 1,
    cost_price: 100,
    sale_price: 200
  }]);
  if (insertAnonErr) {
    console.log("Anon insert failed (as expected if RLS is active):", insertAnonErr.message);
  } else {
    console.log("Anon insert succeeded:", insertAnon);
  }

  // 2. Test with service role key if available
  if (serviceKey) {
    console.log("\n--- Testing with Service Role Key ---");
    const supabaseService = createClient(supabaseUrl, serviceKey);
    const { data: dataService, error: errorService } = await supabaseService.from('devices').select('id, model').limit(5);
    if (errorService) {
      console.error("Service select error:", errorService);
    } else {
      console.log(`Service select successful. Found ${dataService.length} devices:`, dataService);
    }

    const { data: insertService, error: insertServiceErr } = await supabaseService.from('devices').insert([{
      model: 'Test Device Service',
      brand: 'Test',
      condition: 'new',
      status: 'available',
      stock_quantity: 1,
      cost_price: 100,
      sale_price: 200
    }]).select();

    if (insertServiceErr) {
      console.error("Service insert failed:", insertServiceErr);
    } else {
      console.log("Service insert succeeded:", insertService);
      // Clean up
      if (insertService && insertService[0]) {
        await supabaseService.from('devices').delete().eq('id', insertService[0].id);
        console.log("Deleted test device");
      }
    }
  } else {
    console.log("No service role key provided in .env");
  }
}

test();
