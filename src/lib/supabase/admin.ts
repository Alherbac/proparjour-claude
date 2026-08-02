import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Client Supabase avec la clé service_role — CONTOURNE TOUTE LA ROW
 * LEVEL SECURITY.
 *
 * Règles strictes :
 * - Utilisable UNIQUEMENT dans des Route Handlers ou Server Actions
 *   (jamais dans un composant "use client", jamais dans du code
 *   exécuté au chargement d'une page publique).
 * - Réservé aux opérations qui ont explicitement besoin de dépasser
 *   la RLS (ex. validation admin d'un profil, tâches de fond).
 * - Le paquet `server-only` fait échouer le build si ce fichier est
 *   importé, même transitivement, depuis du code client.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
