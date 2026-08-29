/**
 * Format canonique des jours de la semaine — celui réellement écrit
 * en base par le formulaire d'inscription et le tableau de bord
 * (prestataires_profils.disponibilites) : abrégé, capitalisé, sans
 * accent, lundi en premier.
 *
 * Source unique de vérité : toute comparaison contre cette colonne
 * doit passer par ce module plutôt que par une liste locale. C'est
 * exactement l'écart qui existait entre ce format et celui
 * (incorrect, "lundi" en toutes lettres) utilisé par erreur dans
 * lib/matching.ts jusqu'à sa correction — le moteur de matching ne
 * reconnaissait donc jamais aucune disponibilité réelle. Audité :
 * les 56 profils prestataires existants utilisaient déjà ce format,
 * aucune donnée n'a eu besoin d'être corrigée.
 */
export const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

export type JourSemaine = (typeof JOURS_SEMAINE)[number];

/** Jour de la semaine (format canonique ci-dessus) pour une date ISO donnée. */
export function jourDeLaSemaine(dateIso: string): JourSemaine {
  const jsDay = new Date(`${dateIso}T00:00:00`).getDay(); // 0 = dimanche .. 6 = samedi
  const index = (jsDay + 6) % 7; // recale sur JOURS_SEMAINE, qui commence lundi
  return JOURS_SEMAINE[index];
}
