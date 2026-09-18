/**
 * Résolution géographique légère pour le moteur de matching
 * (lib/matching.ts) — correction produit 2026-09-19 : la proximité
 * entre la ville d'une mission et celle d'un prestataire doit nuancer
 * le score, jamais l'exclure. Aucune donnée structurée (code postal,
 * département) n'est stockée en base pour `offres.ville` ni
 * `prestataires_profils.ville` (les deux ne conservent qu'une chaîne
 * texte, voir VilleAutocompleteIdf) — on résout donc le département à
 * la demande via les API officielles data.gouv.fr, jamais une liste de
 * communes maintenue à la main (des centaines de communes en Île-de-
 * France, trop de risque de désynchronisation).
 */

const DEPARTEMENTS_IDF = ["75", "77", "78", "91", "92", "93", "94", "95"] as const;

/** Frontières officielles entre départements franciliens — non exhaustif hors Île-de-France (jamais utile ici, le vivier est IDF uniquement, voir config/zones-couverture.ts). */
const DEPARTEMENTS_ADJACENTS: Record<string, string[]> = {
  "75": ["92", "93", "94"],
  "77": ["93", "94", "91"],
  "78": ["92", "91", "95"],
  "91": ["78", "92", "94", "77"],
  "92": ["75", "78", "91", "94", "95"],
  "93": ["75", "94", "77", "95"],
  "94": ["75", "92", "93", "91", "77"],
  "95": ["78", "92", "93"],
};

export type NiveauProximite = "excellente" | "tres_bonne" | "correcte" | "eloignee" | "non_renseignee";

const LABEL_PROXIMITE: Record<NiveauProximite, string> = {
  excellente: "Excellente",
  tres_bonne: "Très bonne",
  correcte: "Correcte",
  eloignee: "Éloignée",
  non_renseignee: "Non renseignée",
};

export function labelProximite(niveau: NiveauProximite): string {
  return LABEL_PROXIMITE[niveau];
}

/**
 * Département depuis un NOM DE VILLE propre (prestataires_profils.ville,
 * toujours une commune choisie via VilleAutocompleteIdf) — geo.api.gouv.fr,
 * borné à la région Île-de-France (codeRegion=11) pour éviter les
 * homonymes hors IDF (ex. "Saint-Denis" existe aussi à La Réunion et y
 * est plus peuplé — une recherche non bornée s'y résout à tort).
 */
async function departementDepuisVille(ville: string): Promise<string | null> {
  const nom = ville.trim();
  if (!nom) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(nom)}&codeRegion=11&fields=codeDepartement&boost=population&limit=1`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { codeDepartement?: string }[];
    return data[0]?.codeDepartement ?? null;
  } catch {
    return null;
  }
}

/**
 * Département depuis une chaîne libre pouvant être une adresse complète
 * (offres.ville — voir le commentaire de villesCorrespondent dans
 * lib/matching.ts, "21 rue Robert et Sonia Delaunay" plutôt qu'un nom
 * de commune) — Base Adresse Nationale (api-adresse.data.gouv.fr), qui
 * géocode aussi bien une adresse complète qu'un simple nom de ville.
 * Un ", Île-de-France" est ajouté à la requête : sans lui, un nom de
 * ville seul et ambigu (même "Saint-Denis") peut se résoudre hors IDF.
 */
async function departementDepuisAdresse(adresse: string): Promise<string | null> {
  const q = adresse.trim();
  if (!q) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(`${q}, Île-de-France`)}&limit=1`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: { properties?: { depcode?: string } }[] };
    const dep = data.features?.[0]?.properties?.depcode ?? null;
    return dep && (DEPARTEMENTS_IDF as readonly string[]).includes(dep) ? dep : null;
  } catch {
    return null;
  }
}

/**
 * Résout un département à partir d'une valeur `ville` quelconque —
 * essaie d'abord la résolution "nom de commune propre" (rapide, jamais
 * ambiguë une fois bornée à l'IDF), puis se rabat sur la résolution
 * "adresse libre" si la première échoue (cas d'une adresse complète de
 * mission, qu'une recherche par nom de commune ne peut pas retrouver).
 */
export async function departementDe(ville: string): Promise<string | null> {
  const parCommune = await departementDepuisVille(ville);
  if (parCommune) return parCommune;
  return departementDepuisAdresse(ville);
}

/**
 * Résout les départements de plusieurs valeurs `ville` en une seule
 * passe, en dédupliquant les appels réseau (plusieurs prestataires
 * partagent souvent la même ville) — jamais un appel par candidat dans
 * une boucle, voir lib/matching.ts.
 */
export async function departementsDe(villes: string[]): Promise<Map<string, string | null>> {
  const uniques = [...new Set(villes.map((v) => v.trim()).filter(Boolean))];
  const resultats = await Promise.all(uniques.map((v) => departementDe(v)));
  return new Map(uniques.map((v, i) => [v, resultats[i]]));
}

/**
 * Niveau de proximité entre deux départements — jamais une exclusion :
 * un département non résolu (API indisponible, ville hors IDF ou vide)
 * donne "non_renseignee", jamais "trop loin", pour ne pénaliser aucun
 * profil sur un simple échec de résolution plutôt qu'une vraie distance.
 */
export function niveauProximite(deptMission: string | null, deptPrestataire: string | null): NiveauProximite {
  if (!deptMission || !deptPrestataire) return "non_renseignee";
  if (deptMission === deptPrestataire) return "excellente";
  if (DEPARTEMENTS_ADJACENTS[deptMission]?.includes(deptPrestataire)) return "tres_bonne";
  if ((DEPARTEMENTS_IDF as readonly string[]).includes(deptPrestataire)) return "correcte";
  return "eloignee";
}

/** Points attribués (sur `poidsMax`) pour un niveau de proximité — dégressif, jamais nul pour une ville différente mais toujours en Île-de-France (règle produit : la géographie ne rend jamais quelqu'un incompatible). */
export function pointsProximite(niveau: NiveauProximite, poidsMax: number): number {
  switch (niveau) {
    case "excellente":
      return poidsMax;
    case "tres_bonne":
      return Math.round(poidsMax * 0.75 * 100) / 100;
    case "correcte":
      return Math.round(poidsMax * 0.4 * 100) / 100;
    case "eloignee":
      return Math.round(poidsMax * 0.15 * 100) / 100;
    case "non_renseignee":
      return 0;
  }
}
