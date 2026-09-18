import type {
  MissionsRow,
  MissionLignesRow,
  MissionStatutType,
  CandidaturesRow,
  OffresRow,
  PaiementsRow,
  UsersRow,
  EntreprisesRow,
  MetierType,
} from "@/lib/supabase/database.types";

/**
 * Types et fonctions PURES de la couche de données /client — séparés
 * de _data.ts (server-only) pour rester importables depuis un
 * composant client (ex. les pastilles de filtre, qui reçoivent les
 * données déjà chargées côté serveur et les reclassent localement).
 * Next.js refuse qu'un module "server-only" soit importé, même pour
 * un seul type, depuis un composant "use client" — même correctif
 * que lib/admin/reference.ts ailleurs sur le site (constaté ici, pas
 * copié).
 */

export const LABEL_METIER: Record<MetierType, string> = {
  securite: "Agent de sécurité",
  accueil: "Accueil",
  vente: "Vente",
};

export type SessionClient = {
  userId: string;
  email: string;
  profil: UsersRow;
  entreprise: EntreprisesRow | null;
};

export type MissionAvecEquipe = MissionsRow & {
  lignes: (MissionLignesRow & { prenom: string | null; nom: string | null })[];
  paiement: Pick<PaiementsRow, "statut" | "montant"> | null;
  dernierMessageType: "texte" | "systeme" | "devis" | "execution" | null;
};

const STATUTS_EN_COURS: MissionStatutType[] = ["confirmee", "en_cours"];

export function classerMission(m: MissionAvecEquipe): "en_cours" | "a_venir" | "terminee" | "autre" {
  if (m.statut === "terminee") return "terminee";
  if (STATUTS_EN_COURS.includes(m.statut)) return "en_cours";
  if (m.statut === "en_attente") return "a_venir";
  return "autre";
}

/** "Devis à valider" — la dernière chose reçue sur une mission non confirmée est une proposition de prix du prestataire (message type "devis"), le recruteur doit l'accepter/payer. */
export function missionsDevisAValider(missions: MissionAvecEquipe[]): MissionAvecEquipe[] {
  return missions.filter((m) => m.statut === "en_attente" && m.dernierMessageType === "devis");
}

export type OffreAvecCandidatures = OffresRow & {
  candidatures: (CandidaturesRow & {
    prenom: string | null;
    nom: string | null;
    photoUrl: string | null;
    tarifMontant: number;
    tarifType: string;
    statutVerification: string;
    certifications: string[];
  })[];
};

export function candidaturesAExaminer(offres: OffreAvecCandidatures[]): number {
  return offres.reduce((s, o) => s + o.candidatures.filter((c) => c.statut === "en_attente").length, 0);
}
export function candidaturesEcartees(offres: OffreAvecCandidatures[]): number {
  return offres.reduce((s, o) => s + o.candidatures.filter((c) => c.statut === "refusee").length, 0);
}
export function postesAPourvoir(offres: OffreAvecCandidatures[]): number {
  return offres.filter((o) => o.statut === "publiee").length;
}

/** Professionnels déjà retenus par ce recruteur — prestataires distincts avec au moins une ligne de mission acceptée, toutes missions confondues. */
export function getProfessionnelsRetenus(missions: MissionAvecEquipe[]): number {
  const idsPrestataires = new Set<string>();
  for (const m of missions) {
    for (const l of m.lignes) {
      if (l.statut_acceptation === "acceptee") idsPrestataires.add(l.prestataire_id);
    }
  }
  return idsPrestataires.size;
}

export function depenseDuMois(missions: MissionAvecEquipe[]): number {
  const debutMois = new Date();
  debutMois.setDate(1);
  const debutIso = debutMois.toISOString().slice(0, 10);
  return missions
    .filter((m) => m.date_mission >= debutIso && m.paiement && ["sequestre", "libere"].includes(m.paiement.statut))
    .reduce((s, m) => s + Number(m.montant_total), 0);
}

export type ConversationClient = {
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
