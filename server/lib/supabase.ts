import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase server credentials missing. Please check your .env file.');
}

// O cliente do servidor agora usa a Service Role Key para ignorar o RLS em webhooks
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

