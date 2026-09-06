/**
 * "Samedi 29 août" — format de date long utilisé partout où le
 * dossier design attend une date lisible plutôt que l'ISO brut
 * (Candidatures reçues, Détail mission, Messagerie…). Capitalisation
 * manuelle (une seule majuscule, sur le jour) : la classe Tailwind
 * "capitalize" mettrait aussi le mois en majuscule.
 */
export function dateLongueFr(dateIso: string): string {
  const brute = new Date(`${dateIso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return brute.charAt(0).toUpperCase() + brute.slice(1);
}

/** "29 août" — variante sans jour de semaine, pour les cartes compactes où "Samedi 29 août" ne tient pas. */
export function dateCourteFr(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

/**
 * "reçu à l'instant" / "reçu hier" / "reçu il y a 3 j" — ancienneté
 * utilisée dans les blocs "À faire maintenant" (dossier design,
 * tableaux de bord client/prestataire). `verbe` s'accorde au contexte
 * ("reçu", "publiée", "envoyée"...).
 */
/** Nombre de jours écoulés depuis une date ISO — jamais >= 0. */
export function joursDepuis(dateIso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateIso).getTime()) / 86_400_000));
}

export function ancienneteFr(dateIso: string, verbe = "reçu"): string {
  const minutes = Math.floor((Date.now() - new Date(dateIso).getTime()) / 60_000);
  if (minutes < 60) return `${verbe} à l'instant`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `${verbe} il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours === 1) return `${verbe} hier`;
  return `${verbe} il y a ${jours} j`;
}
