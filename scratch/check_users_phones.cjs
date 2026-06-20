const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone, active');

  if (profError) {
    console.error('Error fetching profiles:', profError);
    return;
  }

  // Fetch emails from auth
  let authUsers = [];
  try {
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (!authError) {
      authUsers = users || [];
    }
  } catch (e) {
    console.warn('Failed to fetch auth users:', e);
  }

  console.log('\n--- COLABORADORES CADASTRADOS ---');
  profiles.forEach(profile => {
    const authUser = authUsers.find(u => u.id === profile.id);
    const email = authUser ? authUser.email : 'Sem e-mail';
    console.log(`Nome: ${profile.full_name}`);
    console.log(`E-mail: ${email}`);
    console.log(`Role: ${profile.role}`);
    console.log(`Telefone: ${profile.phone || '⚠️ NÃO CADASTRADO (Bypassa o 2FA)'}`);
    console.log(`Status: ${profile.active ? 'Ativo' : 'Inativo'}`);
    console.log('---------------------------------');
  });
}

checkUsers();
