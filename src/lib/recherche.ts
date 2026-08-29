import { createClient } from "@/lib/supabase/server";
import { SPECIALTY_CATEGORIES } from "@/config/specialtyCategories";
import { METIERS, type MetierId } from "@/config/metiers";
import type { JourSemaine } from "@/config/jours-semaine";
import type { PrestatairesPublicsRow } from "@/lib/supabase/database.types";
import { normaliserTexte, motsProches } from "@/lib/similarite-texte";
import { detecterMetier as detecterMetierParMotsCles } from "@/lib/besoin";

export const RESULTATS_PAR_PAGE = 12;

export type RechercheFiltres = {
  metier?: MetierId;
  ville?: string;
  // Format canonique de prestataires_profils.disponibilites (voir
  // config/jours-semaine.ts) — non "lundi" en toutes lettres. Ce
  // filtre n'est actuellement appelé par aucune page.
  jour?: JourSemaine;
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
  return normaliserTexte(retirerSuffixeGenre(s));
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

/** Tolère une faute de frappe simple (voir motsProches) — "securyte" doit toujours trouver "securite". */
function partagentUnMot(tokensA: string[], tokensB: string[]): boolean {
  return tokensA.some((a) => tokensB.some((b) => motsProches(a, b)));
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

  // Une spécialité d'une filière peut mentionner en passant le mot
  // d'une autre ("Accueil Sécurisé / VIP" est une spécialité
  // Sécurité qui contient "accueil") : à score de couverture égal
  // entre plusieurs filières, l'ordre du tableau METIERS ne doit pas
  // trancher arbitrairement — on garde tous les ex-aequo et on les
  // départage via le vocabulaire courant (lib/besoin.ts) avant de se
  // rabattre sur le premier.
  let meilleurScore = 0;
  let exAequo: MetierId[] = [];
  for (const metier of METIERS) {
    const phrasesSpecialites = SPECIALTY_CATEGORIES[metier.id].flatMap((categorie) =>
      categorie.specialites.map(tokeniser),
    );
    const score = couvertureMax(needle, phrasesSpecialites);
    if (score > meilleurScore) {
      meilleurScore = score;
      exAequo = [metier.id];
    } else if (score === meilleurScore && score > 0) {
      exAequo.push(metier.id);
    }
  }

  const parMotsCles = detecterMetierParMotsCles(normaliser(q));

  if (exAequo.length === 1) return exAequo[0];
  if (exAequo.length > 1) {
    return parMotsCles && exAequo.includes(parMotsCles) ? parMotsCles : exAequo[0];
  }

  // Aucune spécialité exacte touchée : se rabat sur le vocabulaire
  // courant partagé avec le parcours besoin (lib/besoin.ts) —
  // "vendeuse", "vigile", "hôtesse"... des synonymes du quotidien
  // plus larges que les intitulés précis de la taxonomie.
  if (parMotsCles) return parMotsCles;

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

  const [{ data, count, error }, { data: enMission }, { data: fiabiliteData }, { data: avisData }] = await Promise.all([
    classerEnJs
      ? query.order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false }).range(from, to),
    supabase.rpc("prestataires_en_mission_ids"),
    // "Historique de missions" de la vignette (§7, point 8) — même RPC
    // déjà exposée publiquement et déjà utilisée par lib/matching.ts,
    // aucune nouvelle migration nécessaire.
    supabase.rpc("prestataires_fiabilite"),
    supabase.rpc("avis_moyenne_prestataires"),
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
    missionsTermineesParId: new Map((fiabiliteData ?? []).map((f) => [f.prestataire_id, f.missions_terminees])),
    avisParId: new Map((avisData ?? []).map((a) => [a.prestataire_id, { noteMoyenne: a.note_moyenne, nbAvis: a.nb_avis }])),
    // Métier réellement appliqué au filtrage — explicite (chip) ou
    // déduit du mot-clé libre — pour que la page affiche le vrai nom
    // de filière (config/metiers.ts) plutôt qu'un intitulé générique.
    metierActif: filtres.metier ?? metierInfere ?? null,
  };
}
