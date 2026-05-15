import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please check your .env file.');
} else {
  console.log('Supabase initialized with URL:', supabaseUrl);
  // Log apenas o começo da chave para segurança
  console.log('Supabase Key starts with:', supabaseAnonKey.substring(0, 10));
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
