import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  MissionLignesRow,
  MissionsRow,
  PaiementsRow,
  PaiementStatutType,
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

/**
 * Statut du paiement d'une mission, pour affichage neutre (badge,
 * bouton "Payer") côté conversation — voir getLigneMissionPrestataire
 * pour le même principe déjà établi : la table `paiements` n'a pas de
 * policy SELECT pour un prestataire (confidentialité financière), donc
 * on relit uniquement le statut via le client admin. Sûr à appeler
 * pour n'importe quel rôle car la page appelante a déjà vérifié que
 * l'utilisateur courant est un participant légitime de la mission
 * (recruteur ou prestataire) avant d'afficher quoi que ce soit.
 */
export async function getStatutPaiementMission(missionId: string): Promise<PaiementStatutType | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("paiements").select("statut").eq("mission_id", missionId).maybeSingle();
  return data?.statut ?? null;
}

export type LigneProposee = MissionLignesRow & {
  mission: MissionsRow;
  paiement: { statut: PaiementStatutType } | null;
};

/**
 * La table `paiements` n'a pas de policy SELECT pour un prestataire
 * (confidentialité financière — seul le recruteur voit le détail des
 * montants/commission d'une mission, cf. Étape 5). Un prestataire a
 * quand même besoin de savoir si SON paiement est séquestré ou
 * débloqué : on relit uniquement le statut, via le client admin,
 * mais seulement pour des mission_id déjà prouvés légitimes par la
 * requête RLS précédente sur ses propres mission_lignes — jamais de
 * montant ni de commission transmis au navigateur du prestataire.
 */
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
  const admin = createAdminClient();
  const [{ data: missions }, { data: paiements }] = await Promise.all([
    supabase.from("missions").select("*").in("id", missionIds),
    admin.from("paiements").select("mission_id, statut").in("mission_id", missionIds),
  ]);
  const parMission = new Map((missions ?? []).map((m) => [m.id, m]));
  const paiementParMission = new Map((paiements ?? []).map((p) => [p.mission_id, { statut: p.statut }]));

  return lignes
    .filter((ligne) => parMission.has(ligne.mission_id))
    .map((ligne) => ({
      ...ligne,
      mission: parMission.get(ligne.mission_id)!,
      paiement: paiementParMission.get(ligne.mission_id) ?? null,
    }));
}

/**
 * Même chose que getMissionsPrestataire, mais pour une seule mission
 * — utilisé par la synchronisation temps réel (Phase 3) : à la
 * réception d'une notification liée à une mission, on ne re-fetch
 * que cette carte-là, jamais la liste entière.
 */
export async function getLigneMissionPrestataire(
  userId: string,
  missionId: string,
): Promise<LigneProposee | null> {
  const supabase = await createClient();

  const { data: profil } = await supabase
    .from("prestataires_profils")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profil) return null;

  const { data: ligne } = await supabase
    .from("mission_lignes")
    .select("*")
    .eq("prestataire_id", profil.id)
    .eq("mission_id", missionId)
    .maybeSingle();
  if (!ligne) return null;

  const admin = createAdminClient();
  const [{ data: mission }, { data: paiement }] = await Promise.all([
    supabase.from("missions").select("*").eq("id", missionId).maybeSingle(),
    admin.from("paiements").select("statut").eq("mission_id", missionId).maybeSingle(),
  ]);
  if (!mission) return null;

  return { ...ligne, mission, paiement: paiement ? { statut: paiement.statut } : null };
}
