import "server-only";
import { createClient } from "@/lib/supabase/server";
import { montantTotalJournees } from "@/lib/journees";
import type { OffresRow } from "@/lib/supabase/database.types";

export type OffreAdmin = OffresRow & {
  recruteur_nom: string;
  nombre_candidatures: number;
  // Mission multi-jours (migration 0062) — montant total réel (somme
  // des journées, jamais la seule première) et nombre de journées.
  montant_total: number;
  nombre_journees: number;
};

/** Toutes les offres, tous statuts confondus — accessible via la policy "offres_select_..." (public.is_admin()). */
export async function getToutesOffresAdmin(): Promise<OffreAdmin[]> {
  const supabase = await createClient();
  const { data: offres } = await supabase
    .from("offres")
    .select("*")
    .order("created_at", { ascending: false });

  if (!offres || offres.length === 0) return [];

  const recruteurIds = [...new Set(offres.map((o) => o.recruteur_id))];
  const offreIds = offres.map((o) => o.id);

  const [{ data: recruteurs }, { data: candidatures }, { data: journeesRows }] = await Promise.all([
    supabase.from("users").select("id, prenom, nom").in("id", recruteurIds),
    supabase.from("candidatures").select("offre_id").in("offre_id", offreIds),
    // Mission multi-jours (migration 0062) — journées réelles par
    // offre, pour un montant total et un décompte de journées
    // corrects (jamais calculés sur la seule première journée).
    supabase.from("offres_journees").select("offre_id, date, heure_debut, heure_fin").in("offre_id", offreIds),
  ]);

  const parRecruteur = new Map(
    (recruteurs ?? []).map((r) => [r.id, `${r.prenom ?? ""} ${r.nom ?? ""}`.trim() || "Recruteur"]),
  );
  const compteParOffre = new Map<string, number>();
  for (const c of candidatures ?? []) {
    compteParOffre.set(c.offre_id, (compteParOffre.get(c.offre_id) ?? 0) + 1);
  }
  const journeesParOffre = new Map<string, { date: string; heureDebut: string; heureFin: string }[]>();
  for (const j of journeesRows ?? []) {
    const liste = journeesParOffre.get(j.offre_id) ?? [];
    liste.push({ date: j.date, heureDebut: j.heure_debut, heureFin: j.heure_fin });
    journeesParOffre.set(j.offre_id, liste);
  }

  return offres.map((o) => {
    const journees = journeesParOffre.get(o.id) ?? [{ date: o.date_mission, heureDebut: o.heure_debut, heureFin: o.heure_fin }];
    return {
      ...o,
      recruteur_nom: parRecruteur.get(o.recruteur_id) ?? "Recruteur",
      nombre_candidatures: compteParOffre.get(o.id) ?? 0,
      montant_total: montantTotalJournees(journees.map((j) => ({ ...j, tarifHoraire: o.tarif_horaire }))),
      nombre_journees: journees.length,
    };
  });
}
