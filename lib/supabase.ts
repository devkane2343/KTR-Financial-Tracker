import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl) {
  throw new Error(
    'VITE_SUPABASE_URL is required. Set it in .env.local (local) or in your host\'s env vars (e.g. Vercel → Settings → Environment Variables), then rebuild.'
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY is required. Set it in .env.local (local) or in your host\'s env vars (e.g. Vercel → Settings → Environment Variables), then rebuild.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
