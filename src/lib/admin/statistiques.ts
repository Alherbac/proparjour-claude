import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { METIERS, type MetierId } from "@/config/metiers";
import type { MissionStatutType } from "@/lib/supabase/database.types";

export type RepartitionMetier = { metier: MetierId; label: string; nbPrestataires: number; nbMissions: number };

/** Répartition par métier (cahier des charges §3.10) — nombre de prestataires validés et de lignes de mission par filière. */
export async function getRepartitionParMetier(): Promise<RepartitionMetier[]> {
  const admin = createAdminClient();
  const [{ data: profils }, { data: lignes }] = await Promise.all([
    admin.from("prestataires_profils").select("metier"),
    admin.from("mission_lignes").select("metier"),
  ]);

  const prestatairesParMetier = new Map<string, number>();
  for (const p of profils ?? []) {
    prestatairesParMetier.set(p.metier, (prestatairesParMetier.get(p.metier) ?? 0) + 1);
  }
  const missionsParMetier = new Map<string, number>();
  for (const l of lignes ?? []) {
    missionsParMetier.set(l.metier, (missionsParMetier.get(l.metier) ?? 0) + 1);
  }

  return METIERS.map((m) => ({
    metier: m.id,
    label: m.label,
    nbPrestataires: prestatairesParMetier.get(m.id) ?? 0,
    nbMissions: missionsParMetier.get(m.id) ?? 0,
  }));
}

export type RepartitionStatutMission = { statut: MissionStatutType; nb: number };

/** Répartition des missions par statut, toutes périodes confondues — snapshot de l'état actuel de la plateforme. */
export async function getRepartitionStatutMissions(): Promise<{
  parStatut: RepartitionStatutMission[];
  total: number;
  tauxAnnulation: number | null;
}> {
  const admin = createAdminClient();
  const { data } = await admin.from("missions").select("statut");
  const lignes = data ?? [];

  const compteur = new Map<string, number>();
  for (const m of lignes) {
    compteur.set(m.statut, (compteur.get(m.statut) ?? 0) + 1);
  }

  const total = lignes.length;
  const annulees = compteur.get("annulee") ?? 0;

  return {
    parStatut: [...compteur.entries()].map(([statut, nb]) => ({ statut: statut as MissionStatutType, nb })),
    total,
    tauxAnnulation: total > 0 ? Math.round((annulees / total) * 1000) / 10 : null,
  };
}
