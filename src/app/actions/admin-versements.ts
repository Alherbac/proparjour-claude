"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { journaliser } from "@/lib/admin/audit";
import { creerNotification } from "@/lib/notifications";
import { traduireErreurDb } from "@/lib/erreurs-db";

type ActionResult = { success: true } | { success: false; error: string };

/**
 * Marque un virement comme réellement effectué (modèle séquestre
 * simple, pas de Stripe Connect — le virement lui-même se fait hors
 * plateforme, cet écran n'en est que la trace). Idempotent : la clé
 * primaire de versements_prestataires est mission_ligne_id, un second
 * appel pour la même ligne échoue proprement plutôt que de dupliquer
 * la preuve de paiement.
 */
export async function marquerVersementEffectue(missionLigneId: string, reference: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  const admin = createAdminClient();

  const { data: ligne } = await admin
    .from("mission_lignes")
    .select("id, prestataire_id, tarif_applique, mission_id")
    .eq("id", missionLigneId)
    .maybeSingle();
  if (!ligne) {
    return { success: false, error: "Ligne de mission introuvable." };
  }

  const { data: paiement } = await admin.from("paiements").select("statut").eq("mission_id", ligne.mission_id).maybeSingle();
  if (!paiement || paiement.statut !== "libere") {
    return { success: false, error: "Le paiement de cette mission n'est pas (ou plus) débloqué." };
  }

  const { error } = await admin.from("versements_prestataires").insert({
    mission_ligne_id: missionLigneId,
    reference: reference.trim() || null,
    verse_par: session.userId,
  });
  if (error) {
    return {
      success: false,
      error: error.code === "23505" ? "Ce virement est déjà marqué comme effectué." : traduireErreurDb(error, "Impossible d'enregistrer ce virement pour le moment."),
    };
  }

  await journaliser({
    adminId: session.userId,
    action: "versement_marque_effectue",
    cibleType: "mission_ligne",
    cibleId: missionLigneId,
    motif: reference.trim() || null,
    details: { montant: ligne.tarif_applique },
  });

  const { data: profil } = await admin.from("prestataires_profils").select("user_id").eq("id", ligne.prestataire_id).maybeSingle();
  if (profil) {
    await creerNotification({
      userId: profil.user_id,
      type: "paiement_libere",
      titre: "Virement effectué",
      contenu: `${ligne.tarif_applique} € ont été virés pour cette mission.`,
      lien: `/prestataire/revenus`,
      missionId: ligne.mission_id,
    });
  }

  revalidatePath("/admin/versements");
  revalidatePath("/prestataire/revenus");
  return { success: true };
}
