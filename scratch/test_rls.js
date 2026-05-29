import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Emulando chave do cliente (Frontend)

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

async function run() {
  console.log('Testing client-side RLS authorization flow...');
  
  // 1. Fazer login como o usuário Admin
  console.log('Signing in as admin@mdrinformatica.com.br...');
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@mdrinformatica.com.br',
    password: 'Admin@Mdr@2026' // Senha padrão
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }

  const userId = auth.user.id;
  console.log(`Login successful! User ID: ${userId}`);

  // 2. Tentar buscar o próprio perfil como o usuário autenticado (Cenário do Frontend)
  console.log(`Fetching profile for ID ${userId} from client client-side...`);
  const { data: profile, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profError) {
    console.error('❌ RLS BLOCKED READ! Error details:', profError);
  } else {
    console.log('✅ RLS READ SUCCESSFUL! Profile data:', profile);
  }
}

run();
