import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { heuresEntre } from "@/lib/duree";
import { type JourneeMission, dureeTotaleJournees, trierJourneesParDate } from "@/lib/journees";
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

export type ComplementPaiement = { montantDu: number; paye: boolean } | null;

/**
 * Complément pour heures supplémentaires (migration 0060) — même
 * principe que getStatutPaiementMission : safe pour n'importe quel
 * rôle, la page appelante a déjà vérifié la légitimité du participant.
 * `null` = aucun complément n'a jamais été nécessaire sur cette mission.
 */
export async function getComplementPaiementMission(missionId: string): Promise<ComplementPaiement> {
  const admin = createAdminClient();
  const { data } = await admin.from("paiements").select("complement_montant_du, complement_paye").eq("mission_id", missionId).maybeSingle();
  if (!data || data.complement_montant_du === null) return null;
  return { montantDu: data.complement_montant_du, paye: data.complement_paye };
}

export type LignePourFacturePrestataire = {
  missionId: string;
  createdAt: string;
  lieu: string;
  dateMission: string;
  metier: MissionLignesRow["metier"];
  heureDebutPrevue: string;
  heureFinPrevue: string;
  heureDebutReelle: string | null;
  heureFinReelle: string | null;
  finConfirmee: boolean;
  tarifApplique: number;
  tarifFinal: number | null;
  tauxCommission: number;
};

/**
 * Ligne d'UN prestataire sur une mission, pour SA propre facture —
 * client admin, car `paiements` n'a pas de policy SELECT pour un
 * prestataire (même principe que getLignesPrestataire,
 * prestataire/_data.ts) : seul le taux de commission est relu, jamais
 * `montant`/`montant_commission` (des totaux mission, potentiellement
 * partagés entre plusieurs prestataires). `userId` doit être le
 * titulaire de la ligne — vérifié ici, jamais délégué à une policy.
 */
export async function getLignePourFacturePrestataire(missionId: string, userId: string): Promise<LignePourFacturePrestataire | null> {
  const admin = createAdminClient();

  const { data: profil } = await admin.from("prestataires_profils").select("id").eq("user_id", userId).maybeSingle();
  if (!profil) return null;

  const [{ data: mission }, { data: ligne }, { data: paiement }] = await Promise.all([
    admin.from("missions").select("id, created_at, lieu, date_mission").eq("id", missionId).maybeSingle(),
    admin.from("mission_lignes").select("*").eq("mission_id", missionId).eq("prestataire_id", profil.id).maybeSingle(),
    admin.from("paiements").select("statut, taux_commission").eq("mission_id", missionId).maybeSingle(),
  ]);
  if (!mission || !ligne || !paiement) return null;
  if (paiement.statut !== "libere") return null;

  return {
    missionId: mission.id,
    createdAt: mission.created_at,
    lieu: mission.lieu,
    dateMission: mission.date_mission,
    metier: ligne.metier,
    heureDebutPrevue: ligne.heure_debut,
    heureFinPrevue: ligne.heure_fin,
    heureDebutReelle: ligne.heure_debut_reelle,
    heureFinReelle: ligne.heure_fin_reelle,
    finConfirmee: ligne.heure_fin_statut === "confirmee",
    tarifApplique: ligne.tarif_applique,
    tarifFinal: ligne.tarif_final,
    tauxCommission: paiement.taux_commission,
  };
}

export type DevisPrefillMission = {
  prestation: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  lieu: string;
  tarifHoraire: number;
  // Mission multi-jours (migration 0062) — journées réelles de cette
  // ligne (mission_lignes_journees), triées chronologiquement. Absent
  // seulement si aucune ligne journées n'existe encore pour cette
  // mission_ligne (ne devrait plus arriver depuis le backfill de
  // 0062) ; l'appelant retombe alors sur date/heureDebut/heureFin
  // ci-dessus — jamais une deuxième représentation des journées.
  journees?: JourneeMission[];
};

/**
 * Prérempli du formulaire d'envoi de devis (prestataire uniquement,
 * voir EnvoyerDevisForm, message-thread.tsx) — factorisé pour être
 * identique que l'écran d'origine soit /missions/[id] ou la
 * messagerie deux colonnes (/tableau-de-bord/messagerie).
 */
export async function getDevisPrefillPourMission(missionId: string, userId: string): Promise<DevisPrefillMission | null> {
  const supabase = await createClient();
  const { data: profil } = await supabase.from("prestataires_profils").select("id").eq("user_id", userId).maybeSingle();
  if (!profil) return null;

  const [{ data: mission }, { data: ligne }] = await Promise.all([
    supabase.from("missions").select("description, date_mission, lieu").eq("id", missionId).maybeSingle(),
    supabase
      .from("mission_lignes")
      .select("id, heure_debut, heure_fin, tarif_applique")
      .eq("mission_id", missionId)
      .eq("prestataire_id", profil.id)
      .maybeSingle(),
  ]);
  if (!mission || !ligne) return null;

  // Mission multi-jours (migration 0062) — mission_lignes_journees est
  // la source de vérité pour le détail par jour ; mission_lignes.
  // tarif_applique reste leur somme (Phase 2A). Jamais recalculé
  // depuis date_mission/heure_debut/heure_fin quand les journées
  // existent déjà.
  const { data: journeesRows } = await supabase
    .from("mission_lignes_journees")
    .select("date, heure_debut, heure_fin")
    .eq("mission_ligne_id", ligne.id)
    .order("date", { ascending: true });
  const journees: JourneeMission[] | undefined =
    journeesRows && journeesRows.length > 0
      ? trierJourneesParDate(journeesRows.map((j) => ({ date: j.date, heureDebut: j.heure_debut, heureFin: j.heure_fin })))
      : undefined;

  const duree = journees ? dureeTotaleJournees(journees) : heuresEntre(ligne.heure_debut, ligne.heure_fin);
  return {
    prestation: mission.description || "Mission proposée",
    date: mission.date_mission,
    heureDebut: ligne.heure_debut,
    heureFin: ligne.heure_fin,
    lieu: mission.lieu,
    tarifHoraire: duree > 0 ? Math.round((ligne.tarif_applique / duree) * 100) / 100 : ligne.tarif_applique,
    journees,
  };
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
