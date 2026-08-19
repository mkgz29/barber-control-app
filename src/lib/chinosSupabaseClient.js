import { createClient } from "@supabase/supabase-js";

const chinosSupabaseUrl = import.meta.env.VITE_CHINOS_SUPABASE_URL;
const chinosSupabaseAnonKey = import.meta.env.VITE_CHINOS_SUPABASE_ANON_KEY;

if (!chinosSupabaseUrl || !chinosSupabaseAnonKey) {
  console.warn("Faltan las variables de entorno de Supabase de Chinos.");
}

export const chinosSupabase = createClient(
  chinosSupabaseUrl,
  chinosSupabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
