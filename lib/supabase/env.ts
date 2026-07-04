// Import side-effect: instala undici dispatcher en Node runtime antes
// de que supabase-js haga fetch.
import "@/lib/undici-fix";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL no definida en el entorno");
}
if (!anonKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY no definida en el entorno");
}

export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = anonKey;
