import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MissionAdminRow, PersonneAdmin } from "@/lib/admin/missions";

export const FACTURES_PAR_PAGE = 20;

const STATUTS_FACTURABLES = ["sequestre", "libere", "rembourse"] as const;

/** Missions avec un paiement facturable (hors en_attente/echec), triées par date — recherche par nom de client. */
export async function getFacturesAdmin(params: {
  client?: string;
  page?: number;
}): Promise<{ missions: MissionAdminRow[]; total: number; page: number; totalPages: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * FACTURES_PAR_PAGE;
  const to = from + FACTURES_PAR_PAGE - 1;

  let recruteurIdsMatch: string[] | null = null;
  if (params.client?.trim()) {
    const { data } = await admin
      .from("users")
      .select("id")
      .or(`prenom.ilike.%${params.client.trim()}%,nom.ilike.%${params.client.trim()}%`);
    recruteurIdsMatch = (data ?? []).map((u) => u.id);
    if (recruteurIdsMatch.length === 0) return { missions: [], total: 0, page, totalPages: 1 };
  }

  const { data: paiementsFacturables } = await admin
    .from("paiements")
    .select("mission_id")
    .in("statut", STATUTS_FACTURABLES);
  const missionIdsFacturables = (paiementsFacturables ?? []).map((p) => p.mission_id);
  if (missionIdsFacturables.length === 0) return { missions: [], total: 0, page, totalPages: 1 };

  let query = admin.from("missions").select("*", { count: "exact" }).in("id", missionIdsFacturables);
  if (recruteurIdsMatch) query = query.in("recruteur_id", recruteurIdsMatch);

  const { data: missions, count } = await query.order("date_mission", { ascending: false }).range(from, to);
  const total = count ?? 0;
  if (!missions || missions.length === 0) {
    return { missions: [], total, page, totalPages: Math.max(1, Math.ceil(total / FACTURES_PAR_PAGE)) };
  }

  const missionIds = missions.map((m) => m.id);
  const recruteurIds = [...new Set(missions.map((m) => m.recruteur_id))];
  const [{ data: recruteurs }, { data: paiements }] = await Promise.all([
    admin.from("users").select("id, prenom, nom").in("id", recruteurIds),
    admin.from("paiements").select("*").in("mission_id", missionIds),
  ]);
  const recruteurParId = new Map<string, PersonneAdmin>((recruteurs ?? []).map((r) => [r.id, r]));
  const paiementParMission = new Map((paiements ?? []).map((p) => [p.mission_id, p]));

  const missionsAvecInfos: MissionAdminRow[] = missions.map((m) => ({
    ...m,
    recruteur: recruteurParId.get(m.recruteur_id) ?? null,
    lignes: [],
    paiement: paiementParMission.get(m.id) ?? null,
  }));

  return { missions: missionsAvecInfos, total, page, totalPages: Math.max(1, Math.ceil(total / FACTURES_PAR_PAGE)) };
}
