import type {
  MissionsRow,
  MissionLignesRow,
  MissionStatutType,
  LigneStatutType,
  OffresRow,
  CandidaturesRow,
  CandidatureStatutType,
  PaiementStatutType,
  MetierType,
} from "@/lib/supabase/database.types";
import { repartitionLigne } from "@/lib/facturation";
import type { JourneeMission } from "@/lib/journees";

/**
 * Types et fonctions PURES de la couche de données /prestataire —
 * séparées de _data.ts (server-only) pour rester importables depuis
 * un composant client, même correctif que côté /client (voir son
 * _types.ts, constaté ici, jamais importé de là-bas non plus : chaque
 * espace garde sa propre copie, Règle N°0).
 */

export const LABEL_METIER: Record<MetierType, string> = {
  securite: "Agent de sécurité",
  accueil: "Accueil",
  vente: "Vente",
};

export type SessionPrestataire = {
  userId: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  profilId: string;
  metier: MetierType;
  titre: string | null;
  photoUrl: string | null;
  statutVerification: string;
};

export type LigneAvecMission = MissionLignesRow & {
  mission: MissionsRow;
  paiement: { statut: PaiementStatutType; verseLe: string | null; tauxCommission: number } | null;
};

export function classerLigne(l: LigneAvecMission): "a_repondre" | "confirmee" | "realisee" | "autre" {
  if (l.statut_acceptation === "en_attente") return "a_repondre";
  if (l.mission.statut === "terminee") return "realisee";
  if (["confirmee", "en_cours", "en_attente"].includes(l.mission.statut) && l.statut_acceptation === "acceptee") return "confirmee";
  return "autre";
}

export function statutReelPaiement(l: LigneAvecMission): "en_attente" | "debloque" | "verse" {
  if (!l.paiement || l.paiement.statut === "en_attente") return "en_attente";
  if (l.paiement.statut === "sequestre") return "en_attente";
  return l.paiement.verseLe ? "verse" : "debloque";
}

export function missionsAVenir(lignes: LigneAvecMission[]): LigneAvecMission[] {
  return lignes.filter((l) => l.statut_acceptation === "acceptee" && l.mission.statut !== "terminee" && l.mission.statut !== "annulee");
}

export function encaisseDuMois(lignes: LigneAvecMission[]): number {
  const debutMois = new Date();
  debutMois.setDate(1);
  const debutIso = debutMois.toISOString().slice(0, 10);
  return lignes
    .filter((l) => statutReelPaiement(l) === "verse" && l.paiement?.verseLe && l.paiement.verseLe >= debutIso)
    .reduce((s, l) => s + repartitionLigne(l, l.paiement!.tauxCommission).netPrestataire, 0);
}

/**
 * Fiabilité /100 — dérivée des deux seuls compteurs réellement
 * disponibles (fonction Postgres `prestataires_fiabilite`) :
 * 100 - (taux de litiges sur les missions terminées) × 100.
 * "—" (non mesuré) si aucune mission n'est encore terminée : un score
 * de 100 sur zéro mission serait un chiffre plausible mais faux (§8).
 */
export function scoreFiabilite(missionsTerminees: number, nbLitiges: number): number | null {
  if (missionsTerminees === 0) return null;
  return Math.max(0, Math.round(100 - (nbLitiges / missionsTerminees) * 100));
}

/** `journees` — mission multi-jours (migration 0062) : journées réelles de `offre` (offres_journees), éventuellement vide si non backfillée. */
export type CandidatureEnvoyee = CandidaturesRow & { offre: OffresRow; journees: JourneeMission[] };

export function tauxReponse(candidatures: CandidatureEnvoyee[]): number | null {
  if (candidatures.length === 0) return null;
  const repondues = candidatures.filter((c) => c.statut !== "en_attente").length;
  return Math.round((repondues / candidatures.length) * 100);
}

export const BADGE_STATUT_MISSION_PRESTATAIRE: Record<MissionStatutType, string> = {
  en_attente: "À venir",
  confirmee: "Confirmée",
  en_cours: "En cours",
  terminee: "Réalisée",
  annulee: "Annulée",
  litige: "Litige",
};

export const BADGE_STATUT_LIGNE: Record<LigneStatutType, string> = {
  en_attente: "À répondre",
  acceptee: "Acceptée",
  refusee: "Déclinée",
};

export const BADGE_STATUT_CANDIDATURE: Record<CandidatureStatutType, string> = {
  en_attente: "Envoyée",
  en_discussion: "En discussion",
  acceptee: "Retenue",
  refusee: "Non retenue",
};

export type ConversationPrestataire = {
  missionId: string;
  autreId: string;
  autreNom: string;
  lieu: string;
  dateMission: string;
  missionStatut: MissionStatutType;
  dernierMessage: string | null;
  dernierMessageAt: string | null;
  dernierMessageType: "texte" | "systeme" | "devis" | "execution" | null;
  nonLus: number;
};
