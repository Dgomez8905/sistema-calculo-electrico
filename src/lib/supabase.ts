import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

// Ignorar proyectos desmantelados/no resolubles para evitar errores DNS (TypeError: Failed to fetch)
const isDeprecatedDeadHost = supabaseUrl.includes(
  "bercfavycekkkqwlwmap.supabase.co"
);

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    !isDeprecatedDeadHost &&
    supabaseAnonKey &&
    supabaseAnonKey !== "tu_anon_key_de_supabase_aqui"
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
        detectSessionInUrl: typeof window !== "undefined",
      },
    })
  : null;

