/**
 * Zone de couverture de la plateforme (lancement : Île-de-France uniquement).
 * Liste configurable pour permettre l'élargissement à d'autres régions
 * sans modifier la logique métier — voir cahier-des-charges.md, section 1.
 */

export const REGIONS_COUVERTES = ["Île-de-France"] as const;

export const VILLES_COUVERTES = [
  "Paris",
  "Boulogne-Billancourt",
  "Saint-Denis",
  "Argenteuil",
  "Versailles",
  "Créteil",
  "Nanterre",
  "Vitry-sur-Seine",
  "Colombes",
  "Aulnay-sous-Bois",
  "Rueil-Malmaison",
  "Champigny-sur-Marne",
  "Saint-Maur-des-Fossés",
  "Neuilly-sur-Seine",
  "Antony",
  "Levallois-Perret",
  "Issy-les-Moulineaux",
  "Noisy-le-Grand",
  "Cergy",
  "Évry-Courcouronnes",
  "Meaux",
  "Melun",
  "Fontainebleau",
  "Massy",
] as const;

export type VilleCouverte = (typeof VILLES_COUVERTES)[number];

const DIACRITICS_RANGE_START = String.fromCharCode(0x0300);
const DIACRITICS_RANGE_END = String.fromCharCode(0x036f);
const DIACRITICS_REGEX = new RegExp(
  `[${DIACRITICS_RANGE_START}-${DIACRITICS_RANGE_END}]`,
  "g",
);

const normalise = (valeur: string) =>
  valeur.normalize("NFD").replace(DIACRITICS_REGEX, "").trim().toLowerCase();

const VILLES_NORMALISEES = new Set(VILLES_COUVERTES.map(normalise));

export function estVilleCouverte(ville: string): boolean {
  return VILLES_NORMALISEES.has(normalise(ville));
}

export const MESSAGE_HORS_ZONE =
  "Bientôt disponible dans votre ville — pour l'instant, le service est disponible uniquement en Île-de-France.";
