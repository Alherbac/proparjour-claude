import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

/** Client Supabase navigateur, propre à /prestataire (Règle N°0 : pas d'import de src/lib/supabase/client.ts). */
export function creerClientNavigateur() {
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
