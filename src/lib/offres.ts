import { createClient } from "@/lib/supabase/server";
import type {
  OffresRow,
  CandidaturesRow,
  MetierType,
} from "@/lib/supabase/database.types";

export type CandidatureAvecPrestataire = CandidaturesRow & {
  prenom: string | null;
  nom: string | null;
  photo_url: string | null;
};

export type OffreAvecCandidatures = OffresRow & {
  candidatures: CandidatureAvecPrestataire[];
};

export type CandidatureAvecOffre = CandidaturesRow & { offre: OffresRow | null };

/** Offres ouvertes visibles par un prestataire — marché public, éventuellement filtré par métier/ville. */
export async function getOffresPubliees(filtres: {
  metier?: MetierType;
  ville?: string;
}): Promise<OffresRow[]> {
  const supabase = await createClient();
  let query = supabase.from("offres").select("*").eq("statut", "publiee");
  if (filtres.metier) query = query.eq("metier", filtres.metier);
  if (filtres.ville?.trim()) query = query.ilike("ville", `%${filtres.ville.trim()}%`);
  const { data } = await query.order("created_at", { ascending: false });
  return data ?? [];
}

/** Offres publiées par un recruteur, avec les candidatures reçues sur chacune. */
export async function getOffresRecruteur(recruteurId: string): Promise<OffreAvecCandidatures[]> {
  const supabase = await createClient();
  const { data: offres } = await supabase
    .from("offres")
    .select("*")
    .eq("recruteur_id", recruteurId)
    .order("created_at", { ascending: false });

  if (!offres || offres.length === 0) return [];

  const offreIds = offres.map((o) => o.id);
  const { data: candidatures } = await supabase
    .from("candidatures")
    .select("*")
    .in("offre_id", offreIds)
    .order("created_at", { ascending: false });

  const prestataireIds = [...new Set((candidatures ?? []).map((c) => c.prestataire_id))];
  const { data: prestataires } =
    prestataireIds.length > 0
      ? await supabase.from("prestataires_publics").select("id, prenom, nom, photo_url").in("id", prestataireIds)
      : { data: [] as { id: string; prenom: string | null; nom: string | null; photo_url: string | null }[] };

  const parPrestataire = new Map((prestataires ?? []).map((p) => [p.id, p]));
  const parOffre = new Map<string, CandidatureAvecPrestataire[]>();
  for (const c of candidatures ?? []) {
    const p = parPrestataire.get(c.prestataire_id);
    const enrichie: CandidatureAvecPrestataire = {
      ...c,
      prenom: p?.prenom ?? null,
      nom: p?.nom ?? null,
      photo_url: p?.photo_url ?? null,
    };
    parOffre.set(c.offre_id, [...(parOffre.get(c.offre_id) ?? []), enrichie]);
  }

  return offres.map((o) => ({ ...o, candidatures: parOffre.get(o.id) ?? [] }));
}

/** Candidatures d'un prestataire (via l'id de son profil), avec l'offre associée. */
export async function getCandidaturesPrestataire(prestataireProfilId: string): Promise<CandidatureAvecOffre[]> {
  const supabase = await createClient();
  const { data: candidatures } = await supabase
    .from("candidatures")
    .select("*")
    .eq("prestataire_id", prestataireProfilId)
    .order("created_at", { ascending: false });

  if (!candidatures || candidatures.length === 0) return [];

  const offreIds = [...new Set(candidatures.map((c) => c.offre_id))];
  const { data: offres } = await supabase.from("offres").select("*").in("id", offreIds);
  const parOffre = new Map((offres ?? []).map((o) => [o.id, o]));

  return candidatures.map((c) => ({ ...c, offre: parOffre.get(c.offre_id) ?? null }));
}
