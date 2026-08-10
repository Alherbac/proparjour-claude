import type { MetierType, StatutVerificationType } from "@/lib/supabase/database.types";

/**
 * Checklist documentaire par métier — reflète ce que le tunnel
 * d'inscription collecte réellement aujourd'hui (voir
 * getStepsForMetier) : seul le métier sécurité a un document
 * obligatoire pour l'instant. Accueil/vente n'ont aucun document
 * requis tant que l'inscription ne leur en demande pas. Partagé
 * entre le back-office (checklist admin) et le tableau de bord
 * prestataire (upload/re-upload) — ni l'un ni l'autre n'est
 * server-only, contrairement à src/lib/admin/kyc.ts.
 */
export const DOCUMENTS_REQUIS: Record<MetierType, { type: string; label: string }[]> = {
  securite: [{ type: "carte_cnaps", label: "Carte professionnelle CNAPS" }],
  accueil: [],
  vente: [],
};

export type StatutAffiche = "en_attente" | "partiel" | "valide" | "refuse";

/**
 * Statut affiché (calculé, jamais stocké) : "Partiel" quand le
 * prestataire a fourni certains documents requis mais pas tous,
 * distinct de "En attente" (rien fourni, ou tout fourni mais pas
 * encore décidé par l'admin).
 */
export function statutAffiche(dossier: {
  profil: { statut_verification: StatutVerificationType; metier: MetierType };
  justificatifs: { type_document: string }[];
}): StatutAffiche {
  if (dossier.profil.statut_verification === "valide") return "valide";
  if (dossier.profil.statut_verification === "refuse") return "refuse";

  const requis = DOCUMENTS_REQUIS[dossier.profil.metier] ?? [];
  if (requis.length === 0) return "en_attente";

  const fournis = requis.filter((r) =>
    dossier.justificatifs.some((j) => j.type_document === r.type),
  );
  if (fournis.length > 0 && fournis.length < requis.length) return "partiel";
  return "en_attente";
}
