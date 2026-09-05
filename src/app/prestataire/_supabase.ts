import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Clients Supabase propres à cet espace — Règle N°0 : aucun fichier
 * hors /prestataire réutilisé, donc pas d'import de src/lib/supabase/*.
 * Seul src/lib/supabase/database.types.ts est référencé, et
 * uniquement pour ses types (aucun code exécuté, aucune donnée ni
 * comportement partagé) : ça reste la définition du schéma réel de la
 * base, pas un composant applicatif.
 */
export async function creerClientSession() {
  const cookieStore = await cookies();
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : ignoré, le middleware
          // existant (hors périmètre) se charge du rafraîchissement.
        }
      },
    },
  });
}

/** Contourne la RLS — uniquement pour relire des informations d'un autre utilisateur déjà prouvées légitimes (ex. nom de l'interlocuteur d'une conversation). */
export function creerClientAdmin() {
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
