import type { TarifType } from "@/lib/supabase/database.types";

/**
 * Base de calcul officielle d'une journée — utilisée pour convertir le
 * tarif horaire obligatoire du prestataire en tarif journalier
 * indicatif, affiché publiquement pour plus de lisibilité. Les
 * profils historiques encore en tarif_type "journalier" gardent leur
 * montant journalier tel quel (jamais recalculé depuis une valeur
 * horaire qu'ils n'ont pas saisie).
 */
export const HEURES_JOUR_REFERENCE = 8;

/** Toujours le montant affiché publiquement — un tarif journalier, jamais le tarif horaire. */
export function tarifJournalierAffiche(tarifMontant: number, tarifType: TarifType): number {
  return tarifType === "horaire"
    ? Math.round(tarifMontant * HEURES_JOUR_REFERENCE * 100) / 100
    : tarifMontant;
}

/** Tarif horaire de référence du prestataire, utilisé pour avertir le client s'il propose moins. */
export function tarifHoraireReference(tarifMontant: number, tarifType: TarifType): number {
  return tarifType === "horaire"
    ? tarifMontant
    : Math.round((tarifMontant / HEURES_JOUR_REFERENCE) * 100) / 100;
}
