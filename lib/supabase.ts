import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase config missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local in the project root, then restart the dev server or rebuild.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
