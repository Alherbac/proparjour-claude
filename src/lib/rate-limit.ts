import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fenêtre glissante minimale, adossée à Supabase (voir migration
 * 0036 pour le choix de ne pas introduire une dépendance externe
 * type Redis). `fail-open` volontaire : si l'infrastructure de
 * rate-limit elle-même est indisponible (table pas encore migrée,
 * Supabase en panne), on ne bloque jamais un utilisateur légitime —
 * seule une vraie limite dépassée retourne false.
 */
export async function verifierLimiteDebit(cle: string, max: number, fenetreSecondes: number): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("verifier_limite_debit", {
    p_cle: cle,
    p_max: max,
    p_fenetre_secondes: fenetreSecondes,
  });
  if (error) return true;
  return data === true;
}

/** IP du visiteur telle que transmise par le proxy (Vercel définit x-forwarded-for) — "inconnue" en dev local sans proxy. */
export async function ipRequete(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "inconnue";
}
