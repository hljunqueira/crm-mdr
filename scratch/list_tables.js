import { supabase } from '../server/lib/supabase.js';

async function run() {
  const { data: tables, error: tablesErr } = await supabase
    .rpc('exec_sql', { sql_query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" });

  if (tablesErr) {
    console.error("Error querying tables list:", tablesErr);
  } else if (tables) {
    console.log("Database Tables:");
    console.log(tables.map(t => t.table_name).join(', '));
  }
}

run();
