import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { TAUX_COMMISSION_DEFAUT } from "@/lib/stripe/server";

/**
 * Taux de commission réellement appliqué — lit `parametres_commission`
 * (migration 0039, back-office §3.10 "configuration du taux de
 * commission"), avec repli sur la constante `TAUX_COMMISSION_DEFAUT`
 * si la table n'existe pas encore (migration pas encore exécutée) ou
 * si la ligne singleton a été supprimée par erreur — ne doit jamais
 * faire échouer une création de mission.
 */
export async function getTauxCommission(): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("parametres_commission").select("taux").eq("id", true).maybeSingle();
  if (error || !data) return TAUX_COMMISSION_DEFAUT;
  return data.taux;
}
