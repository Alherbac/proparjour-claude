/**
 * Référence courte affichée à côté d'un titre de mission (dossier
 * design — "#2481" etc.). Aucune colonne dédiée en base : dérivée de
 * l'UUID, purement d'affichage, jamais utilisée pour une recherche ou
 * une jointure.
 */
export function refCourteMission(id: string): string {
  return `#${id.replace(/-/g, "").slice(-4).toUpperCase()}`;
}
