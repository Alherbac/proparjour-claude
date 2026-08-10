import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  MissionsRow,
  MissionLignesRow,
  PaiementsRow,
  MissionStatutType,
  MetierType,
} from "@/lib/supabase/database.types";

export const MISSIONS_PAR_PAGE = 20;

export type MissionsAdminFiltres = {
  statut?: MissionStatutType;
  metier?: MetierType;
  dateDebut?: string;
  dateFin?: string;
  client?: string;
  prestataire?: string;
  page?: number;
};

export type PersonneAdmin = { id: string; prenom: string | null; nom: string | null; email?: string };

export type LigneAdmin = MissionLignesRow & { prestataire: PersonneAdmin | null };

export type MissionAdminRow = MissionsRow & {
  recruteur: PersonneAdmin | null;
  lignes: LigneAdmin[];
  paiement: PaiementsRow | null;
};

/**
 * Liste paginée pour /admin/missions — filtres combinés, agrégations
 * en requêtes batchées (jamais une requête par ligne, cahier des
 * charges §17). La recherche par nom client/prestataire résout
 * d'abord les identifiants concernés (2 requêtes ciblées), pas de
 * jointure texte côté SQL avec ce client.
 */
export async function getMissionsAdmin(
  filtres: MissionsAdminFiltres,
): Promise<{ missions: MissionAdminRow[]; total: number; page: number; totalPages: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, filtres.page ?? 1);
  const from = (page - 1) * MISSIONS_PAR_PAGE;
  const to = from + MISSIONS_PAR_PAGE - 1;

  let recruteurIdsMatch: string[] | null = null;
  if (filtres.client?.trim()) {
    const { data } = await admin
      .from("users")
      .select("id")
      .or(`prenom.ilike.%${filtres.client.trim()}%,nom.ilike.%${filtres.client.trim()}%`);
    recruteurIdsMatch = (data ?? []).map((u) => u.id);
    if (recruteurIdsMatch.length === 0) {
      return { missions: [], total: 0, page, totalPages: 1 };
    }
  }

  let missionIdsParPrestataire: string[] | null = null;
  if (filtres.prestataire?.trim() || filtres.metier) {
    let ligneQuery = admin.from("mission_lignes").select("mission_id, prestataire_id");
    if (filtres.metier) ligneQuery = ligneQuery.eq("metier", filtres.metier);

    if (filtres.prestataire?.trim()) {
      const { data: usersMatch } = await admin
        .from("users")
        .select("id")
        .or(`prenom.ilike.%${filtres.prestataire.trim()}%,nom.ilike.%${filtres.prestataire.trim()}%`);
      const userIds = (usersMatch ?? []).map((u) => u.id);
      const { data: profilsMatch } =
        userIds.length > 0
          ? await admin.from("prestataires_profils").select("id").in("user_id", userIds)
          : { data: [] as { id: string }[] };
      const profilIds = (profilsMatch ?? []).map((p) => p.id);
      if (profilIds.length === 0) {
        return { missions: [], total: 0, page, totalPages: 1 };
      }
      ligneQuery = ligneQuery.in("prestataire_id", profilIds);
    }

    const { data: lignesMatch } = await ligneQuery;
    missionIdsParPrestataire = [...new Set((lignesMatch ?? []).map((l) => l.mission_id))];
    if (missionIdsParPrestataire.length === 0) {
      return { missions: [], total: 0, page, totalPages: 1 };
    }
  }

  let query = admin.from("missions").select("*", { count: "exact" });
  if (filtres.statut) query = query.eq("statut", filtres.statut);
  if (filtres.dateDebut) query = query.gte("date_mission", filtres.dateDebut);
  if (filtres.dateFin) query = query.lte("date_mission", filtres.dateFin);
  if (recruteurIdsMatch) query = query.in("recruteur_id", recruteurIdsMatch);
  if (missionIdsParPrestataire) query = query.in("id", missionIdsParPrestataire);

  const { data: missions, count } = await query.order("created_at", { ascending: false }).range(from, to);
  const total = count ?? 0;

  if (!missions || missions.length === 0) {
    return { missions: [], total, page, totalPages: Math.max(1, Math.ceil(total / MISSIONS_PAR_PAGE)) };
  }

  const missionIds = missions.map((m) => m.id);
  const recruteurIds = [...new Set(missions.map((m) => m.recruteur_id))];

  const [{ data: lignes }, { data: paiements }, { data: recruteurs }] = await Promise.all([
    admin.from("mission_lignes").select("*").in("mission_id", missionIds),
    admin.from("paiements").select("*").in("mission_id", missionIds),
    admin.from("users").select("id, prenom, nom").in("id", recruteurIds),
  ]);

  const prestataireIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
  const { data: profils } =
    prestataireIds.length > 0
      ? await admin.from("prestataires_profils").select("id, user_id").in("id", prestataireIds)
      : { data: [] as { id: string; user_id: string }[] };
  const prestataireUserIds = [...new Set((profils ?? []).map((p) => p.user_id))];
  const { data: prestataireUsers } =
    prestataireUserIds.length > 0
      ? await admin.from("users").select("id, prenom, nom").in("id", prestataireUserIds)
      : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };

  const userParId = new Map((prestataireUsers ?? []).map((u) => [u.id, u]));
  const profilParId = new Map((profils ?? []).map((p) => [p.id, p]));
  const recruteurParId = new Map((recruteurs ?? []).map((r) => [r.id, r]));
  const paiementParMission = new Map((paiements ?? []).map((p) => [p.mission_id, p]));
  const lignesParMission = new Map<string, LigneAdmin[]>();
  for (const ligne of lignes ?? []) {
    const profil = profilParId.get(ligne.prestataire_id);
    const user = profil ? userParId.get(profil.user_id) : undefined;
    const enrichie: LigneAdmin = { ...ligne, prestataire: user ?? null };
    lignesParMission.set(ligne.mission_id, [...(lignesParMission.get(ligne.mission_id) ?? []), enrichie]);
  }

  const resultats: MissionAdminRow[] = missions.map((m) => ({
    ...m,
    recruteur: recruteurParId.get(m.recruteur_id) ?? null,
    lignes: lignesParMission.get(m.id) ?? [],
    paiement: paiementParMission.get(m.id) ?? null,
  }));

  return { missions: resultats, total, page, totalPages: Math.max(1, Math.ceil(total / MISSIONS_PAR_PAGE)) };
}

export async function getMissionAdmin(missionId: string): Promise<MissionAdminRow | null> {
  const admin = createAdminClient();
  const { data: mission } = await admin.from("missions").select("*").eq("id", missionId).maybeSingle();
  if (!mission) return null;

  const [{ data: lignes }, { data: paiement }, { data: recruteur }] = await Promise.all([
    admin.from("mission_lignes").select("*").eq("mission_id", missionId),
    admin.from("paiements").select("*").eq("mission_id", missionId).maybeSingle(),
    admin.from("users").select("id, prenom, nom, telephone").eq("id", mission.recruteur_id).maybeSingle(),
  ]);

  const prestataireIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
  const { data: profils } =
    prestataireIds.length > 0
      ? await admin.from("prestataires_profils").select("id, user_id").in("id", prestataireIds)
      : { data: [] as { id: string; user_id: string }[] };
  const prestataireUserIds = [...new Set((profils ?? []).map((p) => p.user_id))];
  const { data: prestataireUsers } =
    prestataireUserIds.length > 0
      ? await admin.from("users").select("id, prenom, nom, telephone").in("id", prestataireUserIds)
      : { data: [] as { id: string; prenom: string | null; nom: string | null; telephone: string | null }[] };

  const userParId = new Map((prestataireUsers ?? []).map((u) => [u.id, u]));
  const profilParId = new Map((profils ?? []).map((p) => [p.id, p]));
  const lignesEnrichies: LigneAdmin[] = (lignes ?? []).map((ligne) => {
    const profil = profilParId.get(ligne.prestataire_id);
    const user = profil ? userParId.get(profil.user_id) : undefined;
    return { ...ligne, prestataire: user ?? null };
  });

  return {
    ...mission,
    recruteur: recruteur ?? null,
    lignes: lignesEnrichies,
    paiement: paiement ?? null,
  };
}
