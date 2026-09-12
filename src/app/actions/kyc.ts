"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin/auth";
import { creerNotification } from "@/lib/notifications";
import { traduireErreurDb } from "@/lib/erreurs-db";
import { journaliser } from "@/lib/admin/audit";
import { getDossierKyc, getVerificationsAutomatiques, calculerCredibilite, type DossierKyc, type VerificationAuto } from "@/lib/admin/kyc";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

/** Charge le détail complet d'un dossier à la demande (§5.3, clic sur une ligne) — évite de tout précalculer pour la file entière. */
export async function chargerDetailKyc(
  profilId: string,
): Promise<ActionResult<{ dossier: DossierKyc; verifications: VerificationAuto[]; credibilite: number } | null>> {
  await requireAdminSession();
  const dossier = await getDossierKyc(profilId);
  if (!dossier) return { success: true, data: null };
  const admin = createAdminClient();
  const verifications = await getVerificationsAutomatiques(dossier, admin);
  return { success: true, data: { dossier, verifications, credibilite: calculerCredibilite(dossier) } };
}

/**
 * Révèle l'IBAN/BIC — journalisé à chaque appel (donnée sensible).
 * Depuis la migration 0053, ces coordonnées sont chiffrées au repos
 * (pgp_sym_encrypt, clé Supabase Vault) : le déchiffrement passe par
 * la fonction `reveler_rib`, réservée à `service_role` (client admin).
 * Le masquage 30 s côté client reste une bonne pratique d'accès.
 */
export async function reveleIbanDossier(profilId: string): Promise<ActionResult<{ iban: string | null; bic: string | null }>> {
  const session = await requireAdminSession();
  const admin = createAdminClient();
  const { data } = await admin.rpc("reveler_rib", { p_profil_id: profilId }).maybeSingle();

  await journaliser({
    adminId: session.userId,
    action: "iban_consulte",
    cibleType: "prestataire_profil",
    cibleId: profilId,
  });

  return { success: true, data: { iban: data?.iban ?? null, bic: data?.bic ?? null } };
}

export async function validerJustificatif(justificatifId: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  const admin = createAdminClient();
  const { error } = await admin
    .from("justificatifs")
    .update({
      statut: "valide",
      motif_refus: null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.userId,
    })
    .eq("id", justificatifId);
  if (error) return { success: false, error: traduireErreurDb(error, "Impossible de valider ce document pour le moment.") };
  return { success: true };
}

export async function refuserJustificatif(justificatifId: string, motif: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!motif.trim()) {
    return { success: false, error: "Merci de préciser un motif de refus." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("justificatifs")
    .update({
      statut: "refuse",
      motif_refus: motif.trim(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.userId,
    })
    .eq("id", justificatifId);
  if (error) return { success: false, error: traduireErreurDb(error, "Impossible de refuser ce document pour le moment.") };
  return { success: true };
}

/**
 * L'admin garde le privilège de validation absolu (cahier des
 * charges §3.3) : aucune vérification automatique ne bloque cette
 * action, même si des documents manquent ou sont encore en attente.
 */
export async function validerDossier(profilId: string): Promise<ActionResult> {
  await requireAdminSession();
  const admin = createAdminClient();

  const { data: profil } = await admin
    .from("prestataires_profils")
    .select("user_id")
    .eq("id", profilId)
    .maybeSingle();
  if (!profil) return { success: false, error: "Dossier introuvable." };

  const { error } = await admin
    .from("prestataires_profils")
    .update({ statut_verification: "valide", motif_refus: null })
    .eq("id", profilId);
  if (error) return { success: false, error: traduireErreurDb(error, "Impossible de valider ce dossier pour le moment.") };

  await creerNotification({
    userId: profil.user_id,
    type: "profil_valide",
    titre: "Profil validé",
    contenu: "Votre profil est vérifié — vous êtes maintenant visible dans les recherches.",
    lien: "/prestataire/profil",
  });

  return { success: true };
}

export async function refuserDossier(profilId: string, motif: string): Promise<ActionResult> {
  await requireAdminSession();
  if (!motif.trim()) {
    return { success: false, error: "Merci de préciser un motif de refus." };
  }
  const admin = createAdminClient();

  const { data: profil } = await admin
    .from("prestataires_profils")
    .select("user_id")
    .eq("id", profilId)
    .maybeSingle();
  if (!profil) return { success: false, error: "Dossier introuvable." };

  const { error } = await admin
    .from("prestataires_profils")
    .update({ statut_verification: "refuse", motif_refus: motif.trim() })
    .eq("id", profilId);
  if (error) return { success: false, error: traduireErreurDb(error, "Impossible de refuser ce dossier pour le moment.") };

  await creerNotification({
    userId: profil.user_id,
    type: "profil_refuse",
    titre: "Profil refusé",
    contenu: motif.trim(),
    lien: "/prestataire/profil",
  });

  return { success: true };
}

export async function demanderDocument(profilId: string, message: string): Promise<ActionResult> {
  await requireAdminSession();
  const admin = createAdminClient();

  const { data: profil } = await admin
    .from("prestataires_profils")
    .select("user_id")
    .eq("id", profilId)
    .maybeSingle();
  if (!profil) return { success: false, error: "Dossier introuvable." };

  await creerNotification({
    userId: profil.user_id,
    type: "document_demande",
    titre: "Document à fournir",
    contenu: message.trim() || "Un document complémentaire est nécessaire pour valider votre profil.",
    lien: "/prestataire/profil",
  });

  return { success: true };
}

/**
 * URL signée à durée limitée (15 min, cahier des charges §2.1) —
 * jamais d'accès public au bucket justificatifs.
 */
export async function obtenirUrlSigneeJustificatif(
  storagePath: string,
): Promise<ActionResult<{ url: string }>> {
  await requireAdminSession();
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("justificatifs")
    .createSignedUrl(storagePath, 15 * 60);
  if (error || !data) {
    return { success: false, error: "Impossible de générer le lien pour le moment." };
  }
  return { success: true, data: { url: data.signedUrl } };
}
