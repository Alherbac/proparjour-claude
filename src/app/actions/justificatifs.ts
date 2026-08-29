"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { traduireErreurDb } from "@/lib/erreurs-db";

type ActionResult = { success: true } | { success: false; error: string };

/**
 * Enregistre (ou remplace) un justificatif après upload direct vers
 * Supabase Storage par le navigateur (le client session n'a que le
 * droit d'insertion sur cette table, pas la mise à jour — réservée à
 * l'admin/modérateur pour la décision — donc un ré-upload après
 * refus passe par le client admin, après vérification explicite que
 * l'appelant est bien propriétaire du dossier). Réinitialise le
 * statut à "en_attente" et efface un éventuel motif de refus
 * précédent : un nouveau fichier mérite un nouvel examen.
 */
export async function enregistrerJustificatif(
  profilId: string,
  typeDocument: string,
  storagePath: string,
): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();
  const { data: profil } = await admin
    .from("prestataires_profils")
    .select("id, user_id")
    .eq("id", profilId)
    .maybeSingle();
  if (!profil || profil.user_id !== user.id) {
    return { success: false, error: "Ce profil ne vous appartient pas." };
  }

  const { data: existant } = await admin
    .from("justificatifs")
    .select("id")
    .eq("prestataire_id", profilId)
    .eq("type_document", typeDocument)
    .maybeSingle();

  if (existant) {
    const { error } = await admin
      .from("justificatifs")
      .update({
        storage_path: storagePath,
        statut: "en_attente",
        motif_refus: null,
        reviewed_at: null,
        reviewed_by: null,
      })
      .eq("id", existant.id);
    if (error) return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer ce document pour le moment.") };
    return { success: true };
  }

  const { error } = await admin.from("justificatifs").insert({
    prestataire_id: profilId,
    type_document: typeDocument,
    storage_path: storagePath,
  });
  if (error) return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer ce document pour le moment.") };
  return { success: true };
}
