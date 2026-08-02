import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Client Supabase pour Server Components / Server Actions / Route
 * Handlers — utilise la clé anon et les cookies de session de
 * l'utilisateur connecté. Soumis à la Row Level Security au même
 * titre que le client navigateur : ce n'est PAS un client admin.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Appelé depuis un Server Component : ignoré, le
            // middleware se charge du rafraîchissement de session.
          }
        },
      },
    },
  );
}
