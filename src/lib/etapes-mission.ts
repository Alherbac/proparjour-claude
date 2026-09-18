import type { DevisStatut } from "@/lib/messages";
import type { PaiementStatutType } from "@/lib/supabase/database.types";

/**
 * Les 13 étapes du parcours d'une mission (dossier design §4/§12) —
 * PURE dérivation de l'état réel (devis, paiement, exécution, avis),
 * jamais un état stocké ni navigable manuellement : contrairement à
 * la maquette de démonstration, il n'y a ici ni sélecteur de rôle ni
 * bouton "aller à l'étape suivante". `calculerEtapeMission` ne fait
 * qu'observer les mêmes données déjà lues par la page/la messagerie.
 */
export type EtapeId =
  | "retenue"
  | "devis"
  | "ajustement"
  | "devis_revise"
  | "accepte"
  | "paye"
  | "commencee"
  | "terminee"
  | "temps_declare"
  | "validation"
  | "service_fait"
  | "libere"
  | "evalue";

/** Couleur de pastille/badge — dossier design §2/§3 (vert/ambre/rouge/gris). */
export type EtapeTone = "green" | "amber" | "red" | "grey";

export const ETAPES: { id: EtapeId; label: string; statutHeader: string; tone: EtapeTone }[] = [
  { id: "retenue", label: "Candidature retenue", statutHeader: "Échange", tone: "grey" },
  { id: "devis", label: "Devis reçu", statutHeader: "Devis à valider", tone: "red" },
  { id: "ajustement", label: "Ajustement demandé", statutHeader: "Ajustement", tone: "amber" },
  { id: "devis_revise", label: "Devis révisé", statutHeader: "Devis à valider", tone: "red" },
  { id: "accepte", label: "Devis accepté", statutHeader: "Paiement", tone: "amber" },
  { id: "paye", label: "Paiement sécurisé", statutHeader: "Confirmée", tone: "green" },
  { id: "commencee", label: "Mission commencée", statutHeader: "En cours", tone: "amber" },
  { id: "terminee", label: "Mission terminée", statutHeader: "À facturer", tone: "red" },
  { id: "temps_declare", label: "Temps travaillé déclaré", statutHeader: "À valider", tone: "red" },
  { id: "validation", label: "Validation du client", statutHeader: "À valider", tone: "red" },
  { id: "service_fait", label: "Service fait", statutHeader: "Service fait", tone: "green" },
  { id: "libere", label: "Paiement libéré", statutHeader: "Terminée", tone: "green" },
  { id: "evalue", label: "Évaluation", statutHeader: "Terminée", tone: "green" },
];

const INDEX_PAR_ID = new Map(ETAPES.map((e, i) => [e.id, i]));

export type EtapeMissionInput = {
  /** Statut du dernier devis de ce fil — absent si aucun devis n'a encore été envoyé. */
  devisStatut: DevisStatut | undefined;
  /** Plus d'une version de devis a déjà été envoyée dans ce fil (après un ajustement). */
  devisRevise: boolean;
  paiementStatut: PaiementStatutType | null;
  heureDebutStatut: "declaree" | "confirmee" | "contestee" | null;
  heureFinStatut: "declaree" | "confirmee" | "contestee" | null;
  serviceFait: boolean;
  complementEnAttente: boolean;
  avisEnvoye: boolean;
};

export type EtapeMission = { id: EtapeId; index: number; label: string; total: number };

/**
 * Retourne l'étape la plus avancée atteinte — jamais une régression
 * (une contestation reste rattachée à l'étape où elle survient plutôt
 * que de faire "reculer" la barre de progression, une contestation
 * n'annule pas ce qui a déjà eu lieu avant elle).
 */
export function calculerEtapeMission(input: EtapeMissionInput): EtapeMission {
  let id: EtapeId = "retenue";

  if (input.devisStatut !== undefined) id = "devis";
  if (input.devisStatut === "ajustement_demande") id = "ajustement";
  if (input.devisRevise && input.devisStatut !== "ajustement_demande") id = "devis_revise";
  if (input.devisStatut === "acceptee") id = "accepte";

  const paiementConfirme = input.paiementStatut !== null && input.paiementStatut !== "en_attente" && input.paiementStatut !== "echec";
  if (paiementConfirme) id = "paye";

  if (input.heureDebutStatut !== null || input.heureFinStatut !== null) id = "commencee";
  if (input.heureFinStatut !== null) id = "terminee";
  if (input.heureFinStatut === "declaree") id = "temps_declare";
  if (input.heureFinStatut === "confirmee" || input.serviceFait) id = "validation";
  if (input.serviceFait) id = "service_fait";
  if (input.serviceFait && input.paiementStatut === "libere" && !input.complementEnAttente) id = "libere";
  if (id === "libere" && input.avisEnvoye) id = "evalue";

  const index = INDEX_PAR_ID.get(id) ?? 0;
  return { id, index, label: ETAPES[index].label, total: ETAPES.length };
}

/** Phrase indiquant qui doit agir maintenant — dossier design §12 ("HINTS"). */
export function indiceEtape(id: EtapeId, estRecruteur: boolean, complementEnAttente: boolean): string {
  if (id === "validation" && complementEnAttente) {
    return estRecruteur
      ? "Un complément de paiement est nécessaire avant la libération des fonds."
      : "Le client règle un complément de paiement pour les heures supplémentaires.";
  }
  const hints: Record<EtapeId, [string, string]> = {
    retenue: ["Le devis attendu n'a pas encore été envoyé.", "Envoyez un devis pour cette mission."],
    devis: ["Un devis attend votre réponse.", "Votre devis attend la réponse du client."],
    ajustement: ["Le prestataire doit répondre à votre demande.", "Le client demande un ajustement."],
    devis_revise: ["Le devis révisé attend votre réponse.", "Votre devis révisé attend le client."],
    accepte: ["Le paiement est en cours de sécurisation.", "Le paiement est en cours de sécurisation."],
    paye: ["Les fonds sont séquestrés. La mission peut avoir lieu.", "Les fonds sont séquestrés. Vous pouvez effectuer la mission."],
    commencee: ["La mission est en cours.", "La mission est en cours."],
    terminee: ["Le prestataire doit déclarer son temps.", "Déclarez vos horaires réels."],
    temps_declare: ["Les horaires déclarés attendent votre confirmation.", "En attente de la confirmation du client."],
    validation: ["Confirmez ou contestez les horaires.", "Le client examine vos horaires."],
    service_fait: ["Service fait confirmé. Paiement en cours de libération.", "Service fait confirmé. Paiement en cours de libération."],
    libere: ["Le paiement a été versé au prestataire.", "Votre paiement a été libéré."],
    evalue: ["Il vous reste à évaluer le prestataire.", "Le client peut désormais vous évaluer."],
  };
  const [client, pro] = hints[id];
  return estRecruteur ? client : pro;
}
