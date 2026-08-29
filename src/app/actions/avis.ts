"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creerNotification } from "@/lib/notifications";

type ActionResult = { success: true } | { success: false; error: string };

/**
 * Notation bidirectionnelle après mission (cahier des charges 3.6,
 * étape 8) : le recruteur note le prestataire, et inversement, sur la
 * même ligne de mission. Éligibilité vérifiée ici plutôt qu'en RLS —
 * même principe que le reste du cycle de vie mission/paiement.
 */
export async function laisserAvis(
  missionLigneId: string,
  note: number,
  commentaire: string,
): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  if (!Number.isInteger(note) || note < 1 || note > 5) {
    return { success: false, error: "La note doit être comprise entre 1 et 5." };
  }
  const texte = commentaire.trim().slice(0, 1000);

  const admin = createAdminClient();

  const { data: ligne } = await admin
    .from("mission_lignes")
    .select("id, mission_id, prestataire_id")
    .eq("id", missionLigneId)
    .maybeSingle();
  if (!ligne) {
    return { success: false, error: "Ligne de mission introuvable." };
  }

  const [{ data: mission }, { data: profil }] = await Promise.all([
    admin.from("missions").select("id, recruteur_id, statut, lieu, date_mission").eq("id", ligne.mission_id).maybeSingle(),
    admin.from("prestataires_profils").select("id, user_id").eq("id", ligne.prestataire_id).maybeSingle(),
  ]);
  if (!mission || !profil) {
    return { success: false, error: "Mission introuvable." };
  }

  const estRecruteur = mission.recruteur_id === user.id;
  const estPrestataire = profil.user_id === user.id;
  if (!estRecruteur && !estPrestataire) {
    return { success: false, error: "Cette mission ne vous concerne pas." };
  }

  if (mission.statut !== "terminee") {
    return { success: false, error: "Vous ne pouvez laisser un avis qu'une fois la mission terminée." };
  }

  const cibleId = estRecruteur ? profil.user_id : mission.recruteur_id;

  const { error } = await admin.from("avis").insert({
    mission_ligne_id: missionLigneId,
    auteur_id: user.id,
    cible_id: cibleId,
    note,
    commentaire: texte || null,
  });
  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Vous avez déjà laissé un avis pour cette mission." };
    }
    return { success: false, error: "Impossible d'enregistrer l'avis pour le moment. Réessayez dans un instant." };
  }

  await creerNotification({
    userId: cibleId,
    type: "nouvel_avis",
    titre: "Nouvel avis reçu",
    contenu: `${mission.lieu} — ${mission.date_mission}`,
    lien: estRecruteur ? undefined : "/tableau-de-bord",
    missionId: mission.id,
  });

  revalidatePath(`/missions/${mission.id}`);
  return { success: true };
}
