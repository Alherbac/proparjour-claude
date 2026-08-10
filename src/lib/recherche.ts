import { createClient } from "@/lib/supabase/server";
import { SPECIALTY_CATEGORIES } from "@/config/specialtyCategories";
import { METIERS, type MetierId } from "@/config/metiers";
import type { PrestatairesPublicsRow } from "@/lib/supabase/database.types";

export const RESULTATS_PAR_PAGE = 12;

export type RechercheFiltres = {
  metier?: MetierId;
  ville?: string;
  jour?: string;
  tarifMin?: number;
  tarifMax?: number;
  q?: string;
  page?: number;
};

/**
 * Recherche par mot-clé tolérante aux accents et aux variantes
 * ("hote de caisse" doit remonter "Hôte(sse) de caisse", "caissier"
 * doit remonter la même spécialité) : on normalise (minuscules, sans
 * accents), on retire les suffixes de genre entre parenthèses
 * ("Vendeur(se)" → "Vendeur") sans toucher aux parenthèses porteuses
 * de sens ("Sécurité Incendie (SSIAP 1/2)"), puis on compare des
 * mots exacts (pluriel simple ignoré) plutôt qu'une inclusion de
 * sous-chaîne — trop permissive ("hote" ⊂ "hôtellerie").
 */
function retirerSuffixeGenre(s: string): string {
  return s.replace(/\([a-zà-ÿ]{1,6}\)/gi, " ");
}

function normaliser(s: string): string {
  return retirerSuffixeGenre(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Variantes de rôle qui ne partagent pas la racine orthographique de la spécialité visée. */
const SYNONYMES_RACINE: Record<string, string> = {
  caissier: "caisse",
  caissiere: "caisse",
};

function radical(mot: string): string {
  const base = SYNONYMES_RACINE[mot] ?? mot;
  return base.length > 4 && base.endsWith("s") ? base.slice(0, -1) : base;
}

function tokeniser(s: string): string[] {
  // Le trait d'union est préservé (pas remplacé par un espace) : des
  // mots composés comme "arrière-caisse" (sécurité) et "hôte de
  // caisse" (vente) ne doivent pas être confondus via leur seul mot
  // "caisse" une fois séparés — voir metierCorrespondant.
  return normaliser(s)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((mot) => mot.length >= 3)
    .map(radical);
}

function partagentUnMot(tokensA: string[], tokensB: string[]): boolean {
  return tokensA.some((a) => tokensB.includes(a));
}

function specialitesCorrespondantes(q: string): string[] {
  const needle = tokeniser(q);
  if (needle.length === 0) return [];
  return Object.values(SPECIALTY_CATEGORIES)
    .flat()
    .flatMap((categorie) => categorie.specialites)
    .filter((specialite) => partagentUnMot(needle, tokeniser(specialite)));
}

function couvertureMax(needle: string[], phrases: string[][]): number {
  let max = 0;
  for (const phrase of phrases) {
    const score = needle.filter((mot) => phrase.includes(mot)).length;
    if (score > max) max = score;
  }
  return max;
}

/**
 * Détermine à quel métier appartient un mot-clé libre (ex. "caissier",
 * "hote de caisse", "vendeur" → vente) — pour élargir la recherche à
 * toute la catégorie plutôt que de renvoyer un résultat vide quand le
 * mot-clé ne correspond à aucune spécialité exacte. On compare
 * d'abord aux spécialités (la correspondance la plus complète, en
 * nombre de mots couverts, l'emporte : "hote de caisse" doit
 * privilégier "Hôte de caisse" — vente, 2 mots couverts — plutôt que
 * "Hôte de Vestiaire" — accueil, 1 seul mot couvert). On ne se rabat
 * sur le libellé/la filière du métier que si aucune spécialité ne
 * matche du tout (ex. "commercial" seul).
 */
function metierCorrespondant(q: string): MetierId | null {
  const needle = tokeniser(q);
  if (needle.length === 0) return null;

  let meilleurMetier: MetierId | null = null;
  let meilleurScore = 0;
  for (const metier of METIERS) {
    const phrasesSpecialites = SPECIALTY_CATEGORIES[metier.id].flatMap((categorie) =>
      categorie.specialites.map(tokeniser),
    );
    const score = couvertureMax(needle, phrasesSpecialites);
    if (score > meilleurScore) {
      meilleurScore = score;
      meilleurMetier = metier.id;
    }
  }
  if (meilleurMetier) return meilleurMetier;

  for (const metier of METIERS) {
    const motsMetier = [...tokeniser(metier.label), ...tokeniser(metier.filiere)];
    if (partagentUnMot(needle, motsMetier)) {
      return metier.id;
    }
  }
  return null;
}

function scorePertinence(prestataire: PrestatairesPublicsRow, needle: string[]): number {
  if (prestataire.titre && partagentUnMot(needle, tokeniser(prestataire.titre))) return 2;
  if (prestataire.specialites.some((s) => partagentUnMot(needle, tokeniser(s)))) return 1;
  return 0;
}

export async function rechercherPrestataires(filtres: RechercheFiltres) {
  const supabase = await createClient();
  const page = Math.max(1, filtres.page ?? 1);
  const from = (page - 1) * RESULTATS_PAR_PAGE;
  const to = from + RESULTATS_PAR_PAGE - 1;

  let query = supabase.from("prestataires_publics").select("*", { count: "exact" });

  if (filtres.metier) {
    query = query.eq("metier", filtres.metier);
  }
  if (filtres.ville?.trim()) {
    query = query.ilike("ville", `%${filtres.ville.trim()}%`);
  }
  if (filtres.jour) {
    query = query.contains("disponibilites", [filtres.jour]);
  }
  if (filtres.tarifMin !== undefined) {
    query = query.gte("tarif_montant", filtres.tarifMin);
  }
  if (filtres.tarifMax !== undefined) {
    query = query.lte("tarif_montant", filtres.tarifMax);
  }

  const texteRecherche = filtres.q?.trim();
  // Si aucun métier n'est déjà imposé par un chip, on essaie de déduire
  // la catégorie visée par le mot-clé, pour élargir la recherche à
  // toute cette catégorie (voir scorePertinence pour le classement) —
  // évite un résultat vide quand le mot-clé (ex. "caissier") ne
  // correspond pas mot pour mot à une spécialité de la taxonomie.
  const metierInfere = !filtres.metier && texteRecherche ? metierCorrespondant(texteRecherche) : null;

  if (texteRecherche) {
    if (metierInfere) {
      query = query.eq("metier", metierInfere);
    } else {
      const matches = specialitesCorrespondantes(texteRecherche);
      query = query.overlaps("specialites", matches.length > 0 ? matches : ["__aucune_correspondance__"]);
    }
  }

  // Quand on élargit à toute une catégorie inférée, le classement par
  // pertinence (titre > spécialité > reste de la catégorie) se fait en
  // JS sur l'ensemble des résultats — la pagination SQL est donc
  // désactivée dans ce cas et appliquée après tri.
  const classerEnJs = Boolean(texteRecherche && metierInfere);

  const [{ data, count, error }, { data: enMission }] = await Promise.all([
    classerEnJs
      ? query.order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false }).range(from, to),
    supabase.rpc("prestataires_en_mission_ids"),
  ]);

  let resultats = data ?? [];
  let total = count ?? 0;

  if (classerEnJs && texteRecherche) {
    const needle = tokeniser(texteRecherche);
    resultats = [...resultats].sort((a, b) => scorePertinence(b, needle) - scorePertinence(a, needle));
    total = resultats.length;
    resultats = resultats.slice(from, to + 1);
  }

  return {
    resultats,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / RESULTATS_PAR_PAGE)),
    error,
    enMissionIds: new Set((enMission ?? []).map((r) => r.prestataire_id)),
  };
}
