"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminRole } from "@/lib/admin/auth";
import { creerNotification } from "@/lib/notifications";
import { traduireErreurDb } from "@/lib/erreurs-db";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

export async function validerJustificatif(justificatifId: string): Promise<ActionResult> {
  const session = await requireAdminRole();
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
  const session = await requireAdminRole();
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
  await requireAdminRole();
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
    lien: "/tableau-de-bord/compte",
  });

  return { success: true };
}

export async function refuserDossier(profilId: string, motif: string): Promise<ActionResult> {
  await requireAdminRole();
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
    lien: "/tableau-de-bord/compte",
  });

  return { success: true };
}

export async function demanderDocument(profilId: string, message: string): Promise<ActionResult> {
  await requireAdminRole();
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
    lien: "/tableau-de-bord/compte",
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
  await requireAdminRole();
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("justificatifs")
    .createSignedUrl(storagePath, 15 * 60);
  if (error || !data) {
    return { success: false, error: "Impossible de générer le lien pour le moment." };
  }
  return { success: true, data: { url: data.signedUrl } };
}
