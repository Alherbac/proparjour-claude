import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MessagesRow } from "@/lib/supabase/database.types";

export type Participant = { userId: string; prenom: string | null; nom: string | null };

export type ParticipantsMission = {
  recruteur: Participant;
  prestataires: Participant[];
};

/**
 * Résout les noms des participants d'une mission pour l'affichage du
 * fil de messages — via le client admin, car un recruteur doit
 * pouvoir voir le prénom d'un prestataire (et inversement) alors que
 * la RLS sur `users` ne l'autorise qu'à voir sa propre ligne. La page
 * appelante vérifie que l'utilisateur courant est bien lui-même un
 * participant avant d'afficher quoi que ce soit.
 */
export async function getParticipantsMission(missionId: string): Promise<ParticipantsMission | null> {
  const admin = createAdminClient();

  const { data: mission } = await admin
    .from("missions")
    .select("id, recruteur_id")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission) return null;

  const { data: recruteurUser } = await admin
    .from("users")
    .select("prenom, nom")
    .eq("id", mission.recruteur_id)
    .maybeSingle();

  const { data: lignes } = await admin
    .from("mission_lignes")
    .select("prestataire_id")
    .eq("mission_id", missionId);
  const prestataireIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];

  const { data: profils } =
    prestataireIds.length > 0
      ? await admin.from("prestataires_profils").select("id, user_id").in("id", prestataireIds)
      : { data: [] as { id: string; user_id: string }[] };
  const userIds = (profils ?? []).map((p) => p.user_id);

  const { data: prestataireUsers } =
    userIds.length > 0
      ? await admin.from("users").select("id, prenom, nom").in("id", userIds)
      : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };

  return {
    recruteur: {
      userId: mission.recruteur_id,
      prenom: recruteurUser?.prenom ?? null,
      nom: recruteurUser?.nom ?? null,
    },
    prestataires: (prestataireUsers ?? []).map((u) => ({
      userId: u.id,
      prenom: u.prenom,
      nom: u.nom,
    })),
  };
}

/**
 * Messages entre deux participants d'une mission, via le client
 * session (RLS) — pas besoin d'admin ici, l'utilisateur courant doit
 * forcément être l'un des deux (expéditeur ou destinataire) pour que
 * la RLS lui rende quoi que ce soit.
 */
export async function getMessagesEntre(
  missionId: string,
  userA: string,
  userB: string,
): Promise<MessagesRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("mission_id", missionId)
    .or(
      `and(expediteur_id.eq.${userA},destinataire_id.eq.${userB}),and(expediteur_id.eq.${userB},destinataire_id.eq.${userA})`,
    )
    .order("created_at", { ascending: true });
  return data ?? [];
}
