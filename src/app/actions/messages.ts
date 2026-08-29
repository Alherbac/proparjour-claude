"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creerNotification } from "@/lib/notifications";
import { getMessagesNonLusPourMission } from "@/lib/messages";
import { traduireErreurDb } from "@/lib/erreurs-db";

type ActionResult = { success: true } | { success: false; error: string };

export async function envoyerMessage(
  missionId: string,
  destinataireId: string,
  contenu: string,
): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }
  const texte = contenu.trim();
  if (!texte) {
    return { success: false, error: "Le message est vide." };
  }

  const admin = createAdminClient();

  const { data: mission } = await admin
    .from("missions")
    .select("id, recruteur_id")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission) {
    return { success: false, error: "Mission introuvable." };
  }

  const estRecruteur = mission.recruteur_id === user.id;

  if (estRecruteur) {
    const { data: lignes } = await admin
      .from("mission_lignes")
      .select("prestataire_id")
      .eq("mission_id", missionId);
    const prestataireIds = (lignes ?? []).map((l) => l.prestataire_id);
    const { data: profils } =
      prestataireIds.length > 0
        ? await admin.from("prestataires_profils").select("user_id").in("id", prestataireIds)
        : { data: [] as { user_id: string }[] };
    const userIds = (profils ?? []).map((p) => p.user_id);
    if (!userIds.includes(destinataireId)) {
      return { success: false, error: "Destinataire invalide pour cette mission." };
    }
  } else {
    if (destinataireId !== mission.recruteur_id) {
      return { success: false, error: "Destinataire invalide pour cette mission." };
    }
    const { data: profil } = await admin
      .from("prestataires_profils")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profil) {
      return { success: false, error: "Profil prestataire introuvable." };
    }
    const { data: ligne } = await admin
      .from("mission_lignes")
      .select("id")
      .eq("mission_id", missionId)
      .eq("prestataire_id", profil.id)
      .maybeSingle();
    if (!ligne) {
      return { success: false, error: "Cette mission ne vous concerne pas." };
    }
  }

  const { error } = await admin.from("messages").insert({
    mission_id: missionId,
    expediteur_id: user.id,
    destinataire_id: destinataireId,
    contenu: texte,
  });
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible d'envoyer le message pour le moment.") };
  }

  await creerNotification({
    userId: destinataireId,
    type: "nouveau_message",
    titre: "Nouveau message",
    contenu: texte.length > 80 ? `${texte.slice(0, 80)}…` : texte,
    lien: `/missions/${missionId}`,
    missionId,
  });

  return { success: true };
}

/**
 * Synchronisation temps réel (Phase 3) : rafraîchit uniquement le
 * badge 💬 d'une mission à la réception d'une notification
 * "nouveau_message", sans refetch de toute la liste.
 */
export async function rafraichirMessagesNonLus(missionId: string): Promise<number> {
  return getMessagesNonLusPourMission(missionId);
}
