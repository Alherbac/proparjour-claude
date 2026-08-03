import { createClient } from "@/lib/supabase/server";
import { SPECIALTY_CATEGORIES } from "@/config/specialtyCategories";
import type { MetierId } from "@/config/metiers";

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
 * `specialites` est un tableau de libellés exacts issus d'une taxonomie
 * fermée (pas du texte libre) — pour une recherche par mot-clé partiel
 * (ex. "SSIAP" doit remonter "Sécurité Incendie (SSIAP 1/2)"), on
 * pré-calcule les libellés correspondants côté JS, puis on filtre en
 * base avec `overlaps` (intersection de tableaux), sans avoir besoin
 * d'une recherche plein texte côté SQL.
 */
function specialitesCorrespondantes(q: string): string[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return Object.values(SPECIALTY_CATEGORIES)
    .flat()
    .flatMap((categorie) => categorie.specialites)
    .filter((specialite) => specialite.toLowerCase().includes(needle));
}

export async function rechercherPrestataires(filtres: RechercheFiltres) {
  const supabase = await createClient();
  const page = Math.max(1, filtres.page ?? 1);
  const from = (page - 1) * RESULTATS_PAR_PAGE;
  const to = from + RESULTATS_PAR_PAGE - 1;

  let query = supabase
    .from("prestataires_publics")
    .select("*", { count: "exact" });

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
  if (filtres.q?.trim()) {
    const matches = specialitesCorrespondantes(filtres.q);
    // Aucun libellé connu ne correspond au mot-clé : on force un
    // résultat vide plutôt que d'ignorer le filtre silencieusement.
    query = query.overlaps("specialites", matches.length > 0 ? matches : ["__aucune_correspondance__"]);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  return {
    resultats: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / RESULTATS_PAR_PAGE)),
    error,
  };
}
