import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Faltan las variables de entorno de Supabase.");
}

const supabase = createClient(
  supabaseUrl || "https://ejemplo.supabase.co",
  supabaseAnonKey || "clave-anonima",
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      persistSession: true,
    },
  }
);

export default supabase;
