import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MessagesRow } from "@/lib/supabase/database.types";

export type ConversationAdmin = {
  missionId: string;
  lieu: string;
  dateMission: string;
  recruteurNom: string;
  dernierMessage: string;
  dernierMessageLe: string;
  nbMessages: number;
};

const MISSIONS_AVEC_MESSAGES_LIMIT = 30;

/** Missions ayant au moins un message, triées par activité la plus récente — vue d'ensemble pour la modération (cahier des charges §3.7/§3.10). */
export async function getConversationsRecentesAdmin(): Promise<ConversationAdmin[]> {
  const admin = createAdminClient();
  const { data: messages } = await admin
    .from("messages")
    .select("mission_id, contenu, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!messages || messages.length === 0) return [];

  const parMission = new Map<string, { dernierMessage: string; dernierMessageLe: string; nb: number }>();
  for (const m of messages) {
    const existant = parMission.get(m.mission_id);
    if (existant) {
      existant.nb += 1;
    } else {
      parMission.set(m.mission_id, { dernierMessage: m.contenu, dernierMessageLe: m.created_at, nb: 1 });
    }
  }

  const missionIds = [...parMission.keys()].slice(0, MISSIONS_AVEC_MESSAGES_LIMIT);
  const { data: missions } = await admin.from("missions").select("id, lieu, date_mission, recruteur_id").in("id", missionIds);
  const recruteurIds = [...new Set((missions ?? []).map((m) => m.recruteur_id))];
  const { data: recruteurs } = recruteurIds.length > 0 ? await admin.from("users").select("id, prenom, nom").in("id", recruteurIds) : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };
  const recruteurParId = new Map((recruteurs ?? []).map((r) => [r.id, r]));

  return (missions ?? [])
    .map((m) => {
      const activite = parMission.get(m.id)!;
      const recruteur = recruteurParId.get(m.recruteur_id);
      return {
        missionId: m.id,
        lieu: m.lieu,
        dateMission: m.date_mission,
        recruteurNom: recruteur ? `${recruteur.prenom ?? ""} ${recruteur.nom ?? ""}`.trim() || "Recruteur" : "Recruteur",
        dernierMessage: activite.dernierMessage,
        dernierMessageLe: activite.dernierMessageLe,
        nbMessages: activite.nb,
      };
    })
    .sort((a, b) => new Date(b.dernierMessageLe).getTime() - new Date(a.dernierMessageLe).getTime());
}

export type ThreadAdmin = {
  mission: { id: string; lieu: string; dateMission: string };
  messages: (MessagesRow & { expediteurNom: string })[];
};

/** Fil complet d'une mission, en lecture seule — pour l'arbitrage de litige (cahier des charges §3.10). */
export async function getThreadAdmin(missionId: string): Promise<ThreadAdmin | null> {
  const admin = createAdminClient();
  const { data: mission } = await admin.from("missions").select("id, lieu, date_mission").eq("id", missionId).maybeSingle();
  if (!mission) return null;

  const { data: messages } = await admin
    .from("messages")
    .select("*")
    .eq("mission_id", missionId)
    .order("created_at", { ascending: true });

  const userIds = [...new Set((messages ?? []).map((m) => m.expediteur_id))];
  const { data: users } = userIds.length > 0 ? await admin.from("users").select("id, prenom, nom").in("id", userIds) : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };
  const userParId = new Map((users ?? []).map((u) => [u.id, u]));

  return {
    mission: { id: mission.id, lieu: mission.lieu, dateMission: mission.date_mission },
    messages: (messages ?? []).map((m) => ({
      ...m,
      expediteurNom: (() => {
        const u = userParId.get(m.expediteur_id);
        return u ? `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || "Utilisateur" : "Système";
      })(),
    })),
  };
}
