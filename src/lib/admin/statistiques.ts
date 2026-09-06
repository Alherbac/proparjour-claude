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

/** Missions créées, groupées par mois — les 4 derniers mois (§5.9, onglet Historique). */
export async function getMissionsParMoisRecent(): Promise<{ mois: string; nb: number }[]> {
  const admin = createAdminClient();
  const depuis = new Date();
  depuis.setMonth(depuis.getMonth() - 3);
  depuis.setDate(1);
  const { data } = await admin.from("missions").select("created_at").gte("created_at", depuis.toISOString());

  const compteur = new Map<string, number>();
  const mois: string[] = [];
  const curseur = new Date(depuis);
  for (let i = 0; i < 4; i++) {
    const cle = curseur.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    mois.push(cle);
    compteur.set(cle, 0);
    curseur.setMonth(curseur.getMonth() + 1);
  }
  for (const m of data ?? []) {
    const cle = new Date(m.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    if (compteur.has(cle)) compteur.set(cle, (compteur.get(cle) ?? 0) + 1);
  }
  return mois.map((cle) => ({ mois: cle.charAt(0).toUpperCase() + cle.slice(1), nb: compteur.get(cle) ?? 0 }));
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
