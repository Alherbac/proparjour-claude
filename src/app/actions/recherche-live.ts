"use server";

import { rechercherPrestataires } from "@/lib/recherche";
import type { MetierId } from "@/config/metiers";
import type { PrestatairesPublicsRow } from "@/lib/supabase/database.types";

export type PrevisualisationFamille = {
  metier: MetierId;
  total: number;
  resultats: PrestatairesPublicsRow[];
  enMissionIds: string[];
};

const APERCU_MAX = 4;

/**
 * Aperçu live d'une famille pendant la saisie — simple recherche
 * catalogue (lib/recherche.ts), jamais le moteur de matching daté
 * (lib/matching.ts, qui exige une date pour vérifier une
 * disponibilité). Réutilisé tel quel, pas un second moteur.
 */
export async function previsualiserFamille(metier: MetierId, ville?: string | null): Promise<PrevisualisationFamille> {
  const { resultats, total, enMissionIds } = await rechercherPrestataires({ metier, ville: ville ?? undefined, page: 1 });
  return { metier, total, resultats: resultats.slice(0, APERCU_MAX), enMissionIds: [...enMissionIds] };
}
