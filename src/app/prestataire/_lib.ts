/**
 * Aides pures, propres à /prestataire — extraites hors composant pour
 * ne jamais appeler Date.now()/new Date() directement dans un rendu
 * (règle du linter react-hooks/purity).
 */
/** Chemin de stockage d'un justificatif — extrait hors composant (même raison que ci-dessous : react-hooks/purity refuse Date.now() dans le corps d'un composant, même dans un gestionnaire d'événement imbriqué). */
export function cheminJustificatif(userId: string, typeDocument: string, extension: string): string {
  return `${userId}/${typeDocument}-${Date.now()}.${extension}`;
}

/** Durée en heures entre deux horaires "HH:MM[:SS]" — gère les missions de nuit qui traversent minuit (fin < début), sans quoi la durée calculée devient négative et affiche "0h". */
export function heuresEntre(heureDebut: string, heureFin: string): number {
  const [hD, mD] = heureDebut.split(":").map(Number);
  const [hF, mF] = heureFin.split(":").map(Number);
  let minutes = hF * 60 + mF - (hD * 60 + mD);
  if (minutes <= 0) minutes += 24 * 60;
  return minutes / 60;
}

export function joursDepuis(dateIso: string): number {
  const diff = Date.now() - new Date(dateIso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function ancienneteFr(dateIso: string): string {
  const heures = Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60));
  if (heures < 1) return "à l'instant";
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours === 1) return "hier";
  return `il y a ${jours} j`;
}

export function dateLongueFr(dateIso: string): string {
  const brut = new Date(`${dateIso}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return brut.charAt(0).toUpperCase() + brut.slice(1);
}

/** Pour un champ "date" pur (ex. date_mission, "2026-09-04") — ajoute un horaire neutre pour éviter que le fuseau du navigateur ne fasse glisser le jour affiché. */
export function dateCourteFr(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Pour un horodatage complet (ex. created_at, déjà "2026-09-04T21:18:19+00:00") — ne PAS ajouter d'horaire, la chaîne est déjà complète (sinon "Invalid Date", constaté en vérification live). */
export function dateCourteFrHorodatage(timestampIso: string): string {
  return new Date(timestampIso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * Format canonique des jours de la semaine réellement écrit en base
 * (prestataires_profils.disponibilites) : abrégé, capitalisé, sans
 * accent, lundi en premier — vérifié dans config/jours-semaine.ts
 * (lu, jamais importé : Règle N°0) après avoir découvert qu'une
 * ancienne version de lib/matching.ts utilisait par erreur le format
 * "lundi" en toutes lettres, qui ne correspondait à aucune donnée
 * réelle. Reproduit ici avec le bon format pour ne pas répéter ce bug.
 */
export const JOURS_SEMAINE = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

export function jourDeLaSemaine(dateIso: string): (typeof JOURS_SEMAINE)[number] {
  const jsDay = new Date(`${dateIso}T00:00:00`).getDay(); // 0=dimanche..6=samedi
  return JOURS_SEMAINE[(jsDay + 6) % 7];
}

/** Une offre "correspond" à la disponibilité si son jour de semaine est coché ET qu'aucune exception ne rend cette date précise indisponible. */
export function correspondDisponibilite(
  dateMission: string,
  disponibilitesHebdo: string[],
  exceptions: { date: string; disponible: boolean }[],
): boolean {
  const exception = exceptions.find((e) => e.date === dateMission);
  if (exception) return exception.disponible;
  return disponibilitesHebdo.includes(jourDeLaSemaine(dateMission));
}

/**
 * "PPJ-2026-4F2A1C" — même convention d'affichage que le reste du
 * site, recalculée à partir de l'id et de la date de création réels
 * de la mission (voir /client/_lib.ts, la même formule y est écrite
 * séparément — Règle N°0 : chaque espace garde sa propre copie).
 */
export function referenceMissionPrestataire(mission: { id: string; created_at: string }): string {
  const annee = new Date(mission.created_at).getFullYear();
  return `PPJ-${annee}-${mission.id.slice(0, 6).toUpperCase()}`;
}
