import { supabase } from '../server/lib/supabase.js';

async function run() {
  const arthurId = 'a57bdab9-98b4-46ce-9ef3-70a0de5c65cb';
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', arthurId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return;
  }
  console.log("Arthur's Profile:", JSON.stringify(profile, null, 2));

  // Check store/unit
  if (profile.store_id) {
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('*')
      .eq('id', profile.store_id)
      .single();
    if (storeErr) {
      console.error("Error fetching store:", storeErr);
    } else {
      console.log("Arthur's Store:", JSON.stringify(store, null, 2));
    }
  }
}

run();
