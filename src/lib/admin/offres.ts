import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OffresRow } from "@/lib/supabase/database.types";

export type OffreAdmin = OffresRow & {
  recruteur_nom: string;
  nombre_candidatures: number;
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

  const [{ data: recruteurs }, { data: candidatures }] = await Promise.all([
    supabase.from("users").select("id, prenom, nom").in("id", recruteurIds),
    supabase.from("candidatures").select("offre_id").in("offre_id", offreIds),
  ]);

  const parRecruteur = new Map(
    (recruteurs ?? []).map((r) => [r.id, `${r.prenom ?? ""} ${r.nom ?? ""}`.trim() || "Recruteur"]),
  );
  const compteParOffre = new Map<string, number>();
  for (const c of candidatures ?? []) {
    compteParOffre.set(c.offre_id, (compteParOffre.get(c.offre_id) ?? 0) + 1);
  }

  return offres.map((o) => ({
    ...o,
    recruteur_nom: parRecruteur.get(o.recruteur_id) ?? "Recruteur",
    nombre_candidatures: compteParOffre.get(o.id) ?? 0,
  }));
}
