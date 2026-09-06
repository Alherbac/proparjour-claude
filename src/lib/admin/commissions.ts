import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { METIERS, type MetierId } from "@/config/metiers";

export type CommissionParStatut = { statut: string; montant: number; nb: number };

export type ResumeCommissions = {
  tauxActuel: number;
  totalPercuLibere: number;
  totalEnAttente: number;
  parStatut: CommissionParStatut[];
};

/** Vue d'ensemble des commissions — historique agrégé par statut de paiement (cahier des charges §3.10, "historique des commissions perçues"). */
export async function getResumeCommissions(): Promise<ResumeCommissions> {
  const admin = createAdminClient();
  const [{ data: parametres }, { data: paiements }] = await Promise.all([
    admin.from("parametres_commission").select("taux").eq("id", true).maybeSingle(),
    admin.from("paiements").select("statut, montant_commission"),
  ]);

  const compteur = new Map<string, { montant: number; nb: number }>();
  for (const p of paiements ?? []) {
    const cur = compteur.get(p.statut) ?? { montant: 0, nb: 0 };
    cur.montant += p.montant_commission;
    cur.nb += 1;
    compteur.set(p.statut, cur);
  }

  const parStatut = [...compteur.entries()]
    .map(([statut, v]) => ({ statut, montant: Math.round(v.montant * 100) / 100, nb: v.nb }))
    .sort((a, b) => b.montant - a.montant);

  return {
    tauxActuel: parametres?.taux ?? 15,
    totalPercuLibere: Math.round((compteur.get("libere")?.montant ?? 0) * 100) / 100,
    totalEnAttente: Math.round((compteur.get("sequestre")?.montant ?? 0) * 100) / 100,
    parStatut,
  };
}

// ─── Hiérarchie de taux (§5.7) : individuel > groupe > référence ───

export type SourceTaux = "individuel" | "groupe" | "reference";

export type LigneTauxMetier = {
  metier: MetierId;
  label: string;
  couleur: string;
  nbPrestataires: number;
  taux: number;
  source: SourceTaux;
};

export type LigneTauxPrestataireIndividuel = {
  prestataireId: string;
  nom: string;
  metier: MetierId;
  nbMissions: number;
  tauxMetierOuReference: number;
  tauxIndividuel: number | null;
};

/** Bloc "Taux par métier" — référence (parametres_commission) remplacée par un taux propre si configuré (taux_commission_metier, 0045). */
export async function getTauxParMetier(): Promise<{ lignes: LigneTauxMetier[]; reference: number; plageMin: number; plageMax: number }> {
  const admin = createAdminClient();
  const [{ data: parametres }, { data: parMetier }, { data: profils }] = await Promise.all([
    admin.from("parametres_commission").select("taux").eq("id", true).maybeSingle(),
    admin.from("taux_commission_metier").select("*"),
    admin.from("prestataires_profils").select("metier"),
  ]);
  const reference = parametres?.taux ?? 15;
  const parMetierMap = new Map((parMetier ?? []).map((t) => [t.metier, t.taux]));
  const effectifs = new Map<string, number>();
  for (const p of profils ?? []) effectifs.set(p.metier, (effectifs.get(p.metier) ?? 0) + 1);

  const lignes: LigneTauxMetier[] = METIERS.map((m) => {
    const propre = parMetierMap.get(m.id);
    return {
      metier: m.id,
      label: m.filiere,
      couleur: m.accent.bg,
      nbPrestataires: effectifs.get(m.id) ?? 0,
      taux: propre ?? reference,
      source: propre !== undefined ? "groupe" : "reference",
    };
  });
  const taux = lignes.map((l) => l.taux);
  return { lignes, reference, plageMin: Math.min(...taux, reference), plageMax: Math.max(...taux, reference) };
}

/** Bloc "Taux individuels" côté prestataires. */
export async function getTauxIndividuelsPrestataires(): Promise<LigneTauxPrestataireIndividuel[]> {
  const admin = createAdminClient();
  const [{ data: individuels }, tauxMetier] = await Promise.all([
    admin.from("taux_commission_prestataire").select("*"),
    getTauxParMetier(),
  ]);
  if (!individuels || individuels.length === 0) return [];

  const profilIds = individuels.map((t) => t.prestataire_id);
  const [{ data: profils }, { data: lignesMission }] = await Promise.all([
    admin.from("prestataires_profils").select("id, user_id, metier").in("id", profilIds),
    admin.from("mission_lignes").select("prestataire_id").in("prestataire_id", profilIds),
  ]);
  const userIds = [...new Set((profils ?? []).map((p) => p.user_id))];
  const { data: users } = userIds.length > 0 ? await admin.from("users").select("id, prenom, nom").in("id", userIds) : { data: [] };
  const userParId = new Map((users ?? []).map((u) => [u.id, u]));
  const profilParId = new Map((profils ?? []).map((p) => [p.id, p]));
  const missionsParProfil = new Map<string, number>();
  for (const l of lignesMission ?? []) missionsParProfil.set(l.prestataire_id, (missionsParProfil.get(l.prestataire_id) ?? 0) + 1);
  const tauxMetierParId = new Map(tauxMetier.lignes.map((l) => [l.metier, l.taux]));

  return individuels.map((t) => {
    const profil = profilParId.get(t.prestataire_id);
    const user = profil ? userParId.get(profil.user_id) : null;
    return {
      prestataireId: t.prestataire_id,
      nom: user ? `${user.prenom ?? ""} ${user.nom ?? ""}`.trim() || "Prestataire" : "Prestataire",
      metier: (profil?.metier ?? "securite") as MetierId,
      nbMissions: missionsParProfil.get(t.prestataire_id) ?? 0,
      tauxMetierOuReference: profil ? (tauxMetierParId.get(profil.metier as MetierId) ?? tauxMetier.reference) : tauxMetier.reference,
      tauxIndividuel: t.taux,
    };
  });
}

// ─── Côté clients — frais (config réelle, NON câblée au paiement) ───

export const SEGMENTS_CLIENT = [
  { id: "grands_comptes", label: "Grands comptes", critere: "10 missions et plus", min: 10, max: Infinity },
  { id: "entreprises_regulieres", label: "Entreprises régulières", critere: "3 à 9 missions", min: 3, max: 9 },
  { id: "entreprises_ponctuelles", label: "Entreprises ponctuelles", critere: "1 à 2 missions", min: 1, max: 2 },
  { id: "clients_particuliers", label: "Clients particuliers", critere: "hors entreprises", min: 0, max: Infinity },
] as const;
export type SegmentId = (typeof SEGMENTS_CLIENT)[number]["id"];

export type LigneTauxSegment = { segment: SegmentId; label: string; critere: string; nbComptes: number; taux: number; source: SourceTaux };

function segmentDe(type: string | null, nbMissions: number): SegmentId {
  if (type !== "recruteur_entreprise") return "clients_particuliers";
  if (nbMissions >= 10) return "grands_comptes";
  if (nbMissions >= 3) return "entreprises_regulieres";
  return "entreprises_ponctuelles";
}

export async function getTauxParSegment(): Promise<{ lignes: LigneTauxSegment[]; reference: number }> {
  const admin = createAdminClient();
  const [{ data: parametres }, { data: parSegment }, { data: recruteurs }, { data: missions }] = await Promise.all([
    admin.from("parametres_commission").select("taux").eq("id", true).maybeSingle(),
    admin.from("taux_frais_segment_client").select("*"),
    admin.from("users").select("id, type").in("type", ["recruteur_particulier", "recruteur_entreprise"]),
    admin.from("missions").select("recruteur_id"),
  ]);
  const reference = parametres?.taux ?? 15;
  const parSegmentMap = new Map((parSegment ?? []).map((t) => [t.segment, t.taux]));
  const missionsParRecruteur = new Map<string, number>();
  for (const m of missions ?? []) missionsParRecruteur.set(m.recruteur_id, (missionsParRecruteur.get(m.recruteur_id) ?? 0) + 1);

  const comptesParSegment = new Map<SegmentId, number>();
  for (const r of recruteurs ?? []) {
    const seg = segmentDe(r.type, missionsParRecruteur.get(r.id) ?? 0);
    comptesParSegment.set(seg, (comptesParSegment.get(seg) ?? 0) + 1);
  }

  const lignes: LigneTauxSegment[] = SEGMENTS_CLIENT.map((s) => {
    const propre = parSegmentMap.get(s.id);
    return {
      segment: s.id,
      label: s.label,
      critere: s.critere,
      nbComptes: comptesParSegment.get(s.id) ?? 0,
      taux: propre ?? reference,
      source: propre !== undefined ? "groupe" : "reference",
    };
  });
  return { lignes, reference };
}

export type LigneTauxClientIndividuel = { recruteurId: string; nom: string; segment: SegmentId; nbMissions: number; tauxSegmentOuReference: number; tauxIndividuel: number };

export async function getTauxIndividuelsClients(): Promise<LigneTauxClientIndividuel[]> {
  const admin = createAdminClient();
  const [{ data: individuels }, tauxSegment] = await Promise.all([admin.from("taux_frais_client").select("*"), getTauxParSegment()]);
  if (!individuels || individuels.length === 0) return [];

  const recruteurIds = individuels.map((t) => t.recruteur_id);
  const [{ data: users }, { data: missions }] = await Promise.all([
    admin.from("users").select("id, prenom, nom, type").in("id", recruteurIds),
    admin.from("missions").select("recruteur_id").in("recruteur_id", recruteurIds),
  ]);
  const userParId = new Map((users ?? []).map((u) => [u.id, u]));
  const missionsParRecruteur = new Map<string, number>();
  for (const m of missions ?? []) missionsParRecruteur.set(m.recruteur_id, (missionsParRecruteur.get(m.recruteur_id) ?? 0) + 1);
  const tauxSegmentParId = new Map(tauxSegment.lignes.map((l) => [l.segment, l.taux]));

  return individuels.map((t) => {
    const u = userParId.get(t.recruteur_id);
    const nbMissions = missionsParRecruteur.get(t.recruteur_id) ?? 0;
    const segment = segmentDe(u?.type ?? null, nbMissions);
    return {
      recruteurId: t.recruteur_id,
      nom: u ? `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || "Client" : "Client",
      segment,
      nbMissions,
      tauxSegmentOuReference: tauxSegmentParId.get(segment) ?? tauxSegment.reference,
      tauxIndividuel: t.taux,
    };
  });
}

/**
 * Missions récentes avec la commission prestataire réellement
 * prélevée (paiements.taux_commission/montant_commission, figés à la
 * création — jamais rétroactifs) ainsi que la source du taux
 * ACTUELLEMENT applicable à ce prestataire (peut différer de celui
 * historiquement appliqué si le taux a changé depuis).
 */
export async function getMissionsAvecCommissionPrestataire(limite = 20) {
  const admin = createAdminClient();
  const [{ data: paiements }, tauxMetier, { data: individuels }] = await Promise.all([
    admin.from("paiements").select("mission_id, montant, montant_commission, taux_commission, statut").order("created_at", { ascending: false }).limit(limite),
    getTauxParMetier(),
    admin.from("taux_commission_prestataire").select("prestataire_id, taux"),
  ]);
  if (!paiements || paiements.length === 0) return [];

  const missionIds = paiements.map((p) => p.mission_id);
  const [{ data: missions }, { data: lignes }] = await Promise.all([
    admin.from("missions").select("id, lieu, date_mission").in("id", missionIds),
    admin.from("mission_lignes").select("mission_id, prestataire_id, metier").in("mission_id", missionIds),
  ]);
  const prestataireIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
  const [{ data: profils }] = await Promise.all([
    prestataireIds.length > 0 ? admin.from("prestataires_profils").select("id, user_id").in("id", prestataireIds) : Promise.resolve({ data: [] as { id: string; user_id: string }[] }),
  ]);
  const userIds = [...new Set((profils ?? []).map((p) => p.user_id))];
  const { data: users } = userIds.length > 0 ? await admin.from("users").select("id, prenom, nom").in("id", userIds) : { data: [] };
  const userParId = new Map((users ?? []).map((u) => [u.id, u]));
  const profilParId = new Map((profils ?? []).map((p) => [p.id, p]));
  const missionParId = new Map((missions ?? []).map((m) => [m.id, m]));
  const ligneParMission = new Map((lignes ?? []).map((l) => [l.mission_id, l]));
  const individuelParId = new Map((individuels ?? []).map((i) => [i.prestataire_id, i.taux]));
  const tauxMetierParId = new Map(tauxMetier.lignes.map((l) => [l.metier, l.taux]));

  return paiements
    .map((p) => {
      const mission = missionParId.get(p.mission_id);
      const ligne = ligneParMission.get(p.mission_id);
      if (!mission || !ligne) return null;
      const profil = profilParId.get(ligne.prestataire_id);
      const user = profil ? userParId.get(profil.user_id) : null;
      const individuel = individuelParId.get(ligne.prestataire_id);
      const tauxActuel = individuel ?? tauxMetierParId.get(ligne.metier as MetierId) ?? tauxMetier.reference;
      const sourceActuelle: SourceTaux = individuel !== undefined ? "individuel" : "groupe";
      return {
        missionId: p.mission_id,
        lieu: mission.lieu,
        dateMission: mission.date_mission,
        prestataire: user ? `${user.prenom ?? ""} ${user.nom ?? ""}`.trim() || "Prestataire" : "Prestataire",
        metier: ligne.metier as MetierId,
        totalTtc: p.montant,
        netPrestataire: Math.round((p.montant - p.montant_commission) * 100) / 100,
        tauxApplique: p.taux_commission,
        commission: p.montant_commission,
        versement: p.statut,
        tauxActuel,
        sourceActuelle,
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);
}

/** Le côté client, appliqué à chaque mission des 20 plus récentes — pour la table (colonnes identiques au côté prestataires). */
export async function getMissionsAvecFraisClient(limite = 20) {
  const admin = createAdminClient();
  const [{ data: missions }, tauxSegment, { data: individuels }] = await Promise.all([
    admin.from("missions").select("id, lieu, date_mission, montant_total, recruteur_id").order("created_at", { ascending: false }).limit(limite),
    getTauxParSegment(),
    admin.from("taux_frais_client").select("recruteur_id, taux"),
  ]);
  if (!missions || missions.length === 0) return [];

  const recruteurIds = [...new Set(missions.map((m) => m.recruteur_id))];
  const [{ data: users }, { data: toutesMissions }, { data: paiements }] = await Promise.all([
    admin.from("users").select("id, prenom, nom, type").in("id", recruteurIds),
    admin.from("missions").select("recruteur_id"),
    admin.from("paiements").select("mission_id, statut").in("mission_id", missions.map((m) => m.id)),
  ]);
  const userParId = new Map((users ?? []).map((u) => [u.id, u]));
  const individuelParId = new Map((individuels ?? []).map((i) => [i.recruteur_id, i.taux]));
  const tauxSegmentParId = new Map(tauxSegment.lignes.map((l) => [l.segment, l.taux]));
  const missionsParRecruteur = new Map<string, number>();
  for (const m of toutesMissions ?? []) missionsParRecruteur.set(m.recruteur_id, (missionsParRecruteur.get(m.recruteur_id) ?? 0) + 1);
  const paiementParMission = new Map((paiements ?? []).map((p) => [p.mission_id, p.statut]));

  return missions.map((m) => {
    const u = userParId.get(m.recruteur_id);
    const segment = segmentDe(u?.type ?? null, missionsParRecruteur.get(m.recruteur_id) ?? 0);
    const individuel = individuelParId.get(m.recruteur_id);
    const taux = individuel ?? tauxSegmentParId.get(segment) ?? tauxSegment.reference;
    const source: SourceTaux = individuel !== undefined ? "individuel" : "groupe";
    const frais = Math.round(m.montant_total * (taux / 100) * 100) / 100;
    return {
      missionId: m.id,
      lieu: m.lieu,
      dateMission: m.date_mission,
      client: u ? `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || "Client" : "Client",
      segment,
      prestation: m.montant_total,
      taux,
      source,
      frais,
      totalFacture: Math.round((m.montant_total + frais) * 100) / 100,
      facturation: paiementParMission.get(m.id) ?? null,
    };
  });
}
