import { createClient } from "@/lib/supabase/server";
import type {
  MissionLignesRow,
  MissionsRow,
  PaiementsRow,
} from "@/lib/supabase/database.types";

export type LigneAvecPrestataire = MissionLignesRow & {
  prenom: string | null;
  nom: string | null;
};

export type PaiementResume = Pick<
  PaiementsRow,
  "statut" | "montant" | "taux_commission" | "montant_commission"
>;

export type MissionAvecLignes = MissionsRow & {
  lignes: LigneAvecPrestataire[];
  paiement: PaiementResume | null;
};

export async function getMissionsRecruteur(
  recruteurId: string,
): Promise<MissionAvecLignes[]> {
  const supabase = await createClient();

  const { data: missions } = await supabase
    .from("missions")
    .select("*")
    .eq("recruteur_id", recruteurId)
    .order("date_mission", { ascending: false });

  if (!missions || missions.length === 0) return [];

  const missionIds = missions.map((m) => m.id);

  const [{ data: lignes }, { data: paiements }] = await Promise.all([
    supabase.from("mission_lignes").select("*").in("mission_id", missionIds),
    supabase
      .from("paiements")
      .select("mission_id, statut, montant, taux_commission, montant_commission")
      .in("mission_id", missionIds),
  ]);

  const prestataireIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
  const { data: prestataires } =
    prestataireIds.length > 0
      ? await supabase.from("prestataires_publics").select("id, prenom, nom").in("id", prestataireIds)
      : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };

  const parPrestataire = new Map((prestataires ?? []).map((p) => [p.id, p]));
  const paiementParMission = new Map((paiements ?? []).map((p) => [p.mission_id, p]));

  return missions.map((mission) => ({
    ...mission,
    paiement: paiementParMission.get(mission.id) ?? null,
    lignes: (lignes ?? [])
      .filter((ligne) => ligne.mission_id === mission.id)
      .map((ligne) => ({
        ...ligne,
        prenom: parPrestataire.get(ligne.prestataire_id)?.prenom ?? null,
        nom: parPrestataire.get(ligne.prestataire_id)?.nom ?? null,
      })),
  }));
}

/**
 * Une seule mission, avec ses lignes et son paiement, pour la facture.
 * S'appuie sur la RLS (client session, pas admin) : si l'appelant
 * n'est pas le recruteur de cette mission, la requête renvoie
 * naturellement null plutôt que de nécessiter une double vérification
 * manuelle des droits.
 */
export async function getMissionPourFacture(
  missionId: string,
): Promise<MissionAvecLignes | null> {
  const supabase = await createClient();

  const { data: mission } = await supabase
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission) return null;

  const [{ data: lignes }, { data: paiement }] = await Promise.all([
    supabase.from("mission_lignes").select("*").eq("mission_id", missionId),
    supabase
      .from("paiements")
      .select("statut, montant, taux_commission, montant_commission")
      .eq("mission_id", missionId)
      .maybeSingle(),
  ]);

  const prestataireIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
  const { data: prestataires } =
    prestataireIds.length > 0
      ? await supabase.from("prestataires_publics").select("id, prenom, nom").in("id", prestataireIds)
      : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };
  const parPrestataire = new Map((prestataires ?? []).map((p) => [p.id, p]));

  return {
    ...mission,
    paiement: paiement ?? null,
    lignes: (lignes ?? []).map((ligne) => ({
      ...ligne,
      prenom: parPrestataire.get(ligne.prestataire_id)?.prenom ?? null,
      nom: parPrestataire.get(ligne.prestataire_id)?.nom ?? null,
    })),
  };
}

export type LigneProposee = MissionLignesRow & {
  mission: MissionsRow;
};

export async function getMissionsPrestataire(userId: string): Promise<LigneProposee[]> {
  const supabase = await createClient();

  const { data: profil } = await supabase
    .from("prestataires_profils")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profil) return [];

  const { data: lignes } = await supabase
    .from("mission_lignes")
    .select("*")
    .eq("prestataire_id", profil.id)
    .order("created_at", { ascending: false });

  if (!lignes || lignes.length === 0) return [];

  const missionIds = [...new Set(lignes.map((l) => l.mission_id))];
  const { data: missions } = await supabase.from("missions").select("*").in("id", missionIds);
  const parMission = new Map((missions ?? []).map((m) => [m.id, m]));

  return lignes
    .filter((ligne) => parMission.has(ligne.mission_id))
    .map((ligne) => ({ ...ligne, mission: parMission.get(ligne.mission_id)! }));
}
