import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MessagesRow } from "@/lib/supabase/database.types";

export type Conversation = {
  missionId: string;
  lieu: string;
  dateMission: string;
  autreNom: string;
  dernierMessage: string | null;
  dernierMessageAt: string | null;
  nonLus: number;
};

/**
 * Message système généré automatiquement par une action du cycle de
 * vie de la mission (acceptation, refus, service fait, confirmation,
 * litige, annulation) — injecté dans le fil de discussion concerné
 * en plus de la notification, pour que l'historique de la mission
 * soit visible directement dans la conversation. Best-effort comme
 * creerNotification : ne doit jamais faire échouer l'action métier.
 */
export async function creerMessageSysteme(params: {
  missionId: string;
  expediteurId: string;
  destinataireId: string;
  contenu: string;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("messages").insert({
      mission_id: params.missionId,
      expediteur_id: params.expediteurId,
      destinataire_id: params.destinataireId,
      contenu: params.contenu,
      type: "systeme",
    });
  } catch {
    // Volontairement ignoré — voir commentaire ci-dessus.
  }
}

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

/**
 * Nombre de messages non lus adressés à l'utilisateur courant, par
 * mission — pour afficher un badge sur la carte mission concernée
 * plutôt qu'une simple cloche générique.
 */
export async function getMessagesNonLusParMission(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data } = await supabase
    .from("messages")
    .select("mission_id")
    .eq("destinataire_id", user.id)
    .eq("lu", false);

  const compte: Record<string, number> = {};
  for (const row of data ?? []) {
    compte[row.mission_id] = (compte[row.mission_id] ?? 0) + 1;
  }
  return compte;
}

/**
 * Même chose que getMessagesNonLusParMission, mais pour une seule
 * mission — utilisé par la synchronisation temps réel (Phase 3).
 */
export async function getMessagesNonLusPourMission(missionId: string): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("mission_id", missionId)
    .eq("destinataire_id", user.id)
    .eq("lu", false);

  return count ?? 0;
}

/**
 * Boîte de réception de l'onglet "Messages" du tableau de bord : une
 * entrée par mission à laquelle l'utilisateur courant participe
 * (recruteur ou prestataire), avec l'aperçu du dernier message et le
 * nombre de non-lus — triées par activité récente, missions sans
 * message encore en dernier (triées par date de mission).
 */
export async function getConversationsUtilisateur(): Promise<Conversation[]> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profilPrestataire } = await supabase
    .from("prestataires_profils")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  const missionIdsPrestataire = profilPrestataire
    ? (
        await supabase
          .from("mission_lignes")
          .select("mission_id")
          .eq("prestataire_id", profilPrestataire.id)
      ).data?.map((l) => l.mission_id) ?? []
    : [];

  const { data: missionsRecruteur } = await supabase
    .from("missions")
    .select("id, lieu, date_mission, recruteur_id")
    .eq("recruteur_id", user.id);

  const { data: missionsPrestataire } =
    missionIdsPrestataire.length > 0
      ? await supabase
          .from("missions")
          .select("id, lieu, date_mission, recruteur_id")
          .in("id", missionIdsPrestataire)
      : { data: [] as { id: string; lieu: string; date_mission: string; recruteur_id: string }[] };

  const missions = [...(missionsRecruteur ?? []), ...(missionsPrestataire ?? [])];
  if (missions.length === 0) return [];

  const estRecruteurDe = new Set((missionsRecruteur ?? []).map((m) => m.id));
  const missionIds = missions.map((m) => m.id);

  const [{ data: lignes }, { data: messages }, nonLusParMission] = await Promise.all([
    admin.from("mission_lignes").select("mission_id, prestataire_id").in("mission_id", missionIds),
    supabase
      .from("messages")
      .select("mission_id, contenu, created_at, expediteur_id, destinataire_id")
      .in("mission_id", missionIds)
      .or(`expediteur_id.eq.${user.id},destinataire_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
    getMessagesNonLusParMission(),
  ]);

  const prestataireProfilIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
  const { data: prestataireProfils } =
    prestataireProfilIds.length > 0
      ? await admin.from("prestataires_profils").select("id, user_id").in("id", prestataireProfilIds)
      : { data: [] as { id: string; user_id: string }[] };
  const userIdParProfilId = new Map((prestataireProfils ?? []).map((p) => [p.id, p.user_id]));

  const contreParties = new Set<string>();
  for (const mission of missions) {
    if (estRecruteurDe.has(mission.id)) {
      for (const l of (lignes ?? []).filter((l) => l.mission_id === mission.id)) {
        const uid = userIdParProfilId.get(l.prestataire_id);
        if (uid) contreParties.add(uid);
      }
    } else {
      contreParties.add(mission.recruteur_id);
    }
  }
  const { data: usersContreParties } =
    contreParties.size > 0
      ? await admin.from("users").select("id, prenom, nom").in("id", [...contreParties])
      : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };
  const nomParUserId = new Map(
    (usersContreParties ?? []).map((u) => [u.id, `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || "Utilisateur ProParJour"]),
  );

  const dernierMessageParMission = new Map<string, MessagesRow>();
  for (const m of messages ?? []) {
    if (!dernierMessageParMission.has(m.mission_id)) {
      dernierMessageParMission.set(m.mission_id, m as MessagesRow);
    }
  }

  const conversations: Conversation[] = missions.map((mission) => {
    let autreNom = "Utilisateur ProParJour";
    if (estRecruteurDe.has(mission.id)) {
      const prestataireIds = (lignes ?? [])
        .filter((l) => l.mission_id === mission.id)
        .map((l) => userIdParProfilId.get(l.prestataire_id))
        .filter((v): v is string => Boolean(v));
      autreNom = prestataireIds.map((id) => nomParUserId.get(id)).filter(Boolean).join(", ") || autreNom;
    } else {
      autreNom = nomParUserId.get(mission.recruteur_id) ?? autreNom;
    }
    const dernier = dernierMessageParMission.get(mission.id);
    return {
      missionId: mission.id,
      lieu: mission.lieu,
      dateMission: mission.date_mission,
      autreNom,
      dernierMessage: dernier?.contenu ?? null,
      dernierMessageAt: dernier?.created_at ?? null,
      nonLus: nonLusParMission[mission.id] ?? 0,
    };
  });

  return conversations.sort((a, b) => {
    if (a.dernierMessageAt && b.dernierMessageAt) {
      return a.dernierMessageAt < b.dernierMessageAt ? 1 : -1;
    }
    if (a.dernierMessageAt) return -1;
    if (b.dernierMessageAt) return 1;
    return a.dateMission < b.dateMission ? 1 : -1;
  });
}
