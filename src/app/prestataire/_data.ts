import "server-only";
import { cache } from "react";
import { creerClientSession, creerClientAdmin } from "@/app/prestataire/_supabase";
import type { SessionPrestataire, LigneAvecMission, CandidatureEnvoyee, ConversationPrestataire } from "@/app/prestataire/_types";
import type { MetierType } from "@/lib/supabase/database.types";
import type { JourneeMission } from "@/lib/journees";

/**
 * Couche de données propre à /prestataire — Règle N°0 : écrite de
 * zéro, aucune requête copiée d'un fichier existant. Types et
 * fonctions pures dans _types.ts (importable côté client).
 */
export * from "@/app/prestataire/_types";

export const getSessionPrestataire = cache(async (): Promise<SessionPrestataire | null> => {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profilUser }, { data: profilPrestataire }] = await Promise.all([
    supabase.from("users").select("type, prenom, nom").eq("id", user.id).maybeSingle(),
    supabase.from("prestataires_profils").select("id, metier, titre, photo_url, statut_verification").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!profilUser || profilUser.type !== "prestataire" || !profilPrestataire) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    prenom: profilUser.prenom,
    nom: profilUser.nom,
    profilId: profilPrestataire.id,
    metier: profilPrestataire.metier,
    titre: profilPrestataire.titre,
    photoUrl: profilPrestataire.photo_url,
    statutVerification: profilPrestataire.statut_verification,
  };
});

/**
 * Distingue, quand getSessionPrestataire renvoie null, "pas connecté"
 * de "connecté mais inscription prestataire pas encore complétée"
 * (bug staging : la confirmation d'e-mail renvoyait vers
 * /inscription/recruteur au lieu de reprendre l'onboarding prestataire,
 * et /prestataire lui-même renvoyait ensuite vers /connexion alors que
 * la session existe déjà — voir _prestataire/wizard.tsx et
 * /auth/confirm/route.ts). Même construction que
 * client/_data.ts::profilRecruteurIncomplet, écrite indépendamment
 * (Règle N°0).
 */
export const profilPrestataireIncomplet = cache(async (): Promise<boolean> => {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profil } = await supabase.from("users").select("type").eq("id", user.id).maybeSingle();
  return profil !== null && profil.type === null;
});

/**
 * `role_intent` posé dans `user_metadata` au moment du signUp (voir
 * wizard.tsx) — distingue un prestataire inachevé d'un recruteur
 * inachevé qui atterrirait ici (les deux sont identiques en base :
 * `users.type IS NULL`). Même construction que
 * client/_data.ts::roleIntentSession, écrite indépendamment (Règle N°0).
 */
export const roleIntentSession = cache(async (): Promise<string | null> => {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (user?.user_metadata?.role_intent as string | undefined) ?? null;
});

/** Toutes les lignes de mission de ce prestataire, mission et paiement inclus — source unique pour Votre activité ET Vos missions ET Revenus. */
export const getLignesPrestataire = cache(async (profilId: string): Promise<LigneAvecMission[]> => {
  const supabase = await creerClientSession();
  const admin = creerClientAdmin();

  const { data: lignes } = await supabase.from("mission_lignes").select("*").eq("prestataire_id", profilId).order("created_at", { ascending: false });
  if (!lignes || lignes.length === 0) return [];

  const missionIds = [...new Set(lignes.map((l) => l.mission_id))];
  const [{ data: missions }, { data: paiements }, { data: versements }] = await Promise.all([
    supabase.from("missions").select("*").in("id", missionIds),
    // La table `paiements` n'a pas de policy SELECT pour un
    // prestataire (confidentialité : seul le recruteur voit le
    // montant TOTAL de la mission, qui peut porter plusieurs
    // prestataires) — on relit le statut et le taux de commission,
    // jamais `montant`/`montant_commission` (des totaux mission,
    // potentiellement partagés entre plusieurs prestataires). Le taux
    // seul permet de calculer le "brut / commission / net" de SA
    // PROPRE ligne (repartitionLigne, lib/facturation.ts) sans rien
    // révéler du montant global ni de ce que gagnent d'autres
    // prestataires sur la même mission.
    admin.from("paiements").select("mission_id, statut, taux_commission").in("mission_id", missionIds),
    admin.from("versements_prestataires").select("mission_ligne_id, verse_le").in("mission_ligne_id", lignes.map((l) => l.id)),
  ]);

  const missionParId = new Map((missions ?? []).map((m) => [m.id, m]));
  const paiementParMission = new Map((paiements ?? []).map((p) => [p.mission_id, p]));
  const verseLeParLigne = new Map((versements ?? []).map((v) => [v.mission_ligne_id, v.verse_le]));

  return lignes
    .filter((l) => missionParId.has(l.mission_id))
    .map((l) => {
      const paiement = paiementParMission.get(l.mission_id);
      return {
        ...l,
        mission: missionParId.get(l.mission_id)!,
        paiement: paiement
          ? { statut: paiement.statut, verseLe: verseLeParLigne.get(l.id) ?? null, tauxCommission: paiement.taux_commission }
          : null,
      };
    });
});

export const getProfilComplet = cache(async (userId: string) => {
  const supabase = await creerClientSession();
  const { data } = await supabase.from("prestataires_profils").select("*").eq("user_id", userId).maybeSingle();
  return data;
});

/** Fiabilité réelle — fonction Postgres prestataires_fiabilite (missions terminées / litiges), jamais une valeur saisie à part. */
export const getFiabiliteBrute = cache(async (profilId: string): Promise<{ missionsTerminees: number; nbLitiges: number }> => {
  const admin = creerClientAdmin();
  const { data } = await admin.rpc("prestataires_fiabilite");
  const ligne = (data ?? []).find((d: { prestataire_id: string; missions_terminees: number; nb_litiges: number }) => d.prestataire_id === profilId);
  return { missionsTerminees: ligne?.missions_terminees ?? 0, nbLitiges: ligne?.nb_litiges ?? 0 };
});

export const getCandidaturesEnvoyees = cache(async (profilId: string): Promise<CandidatureEnvoyee[]> => {
  const supabase = await creerClientSession();
  const { data: candidatures } = await supabase.from("candidatures").select("*").eq("prestataire_id", profilId).order("created_at", { ascending: false });
  if (!candidatures || candidatures.length === 0) return [];

  // La policy RLS "offres_select" ne rend une offre visible que si
  // elle est encore "publiee", ou à son recruteur — un prestataire
  // perd donc l'accès à ses PROPRES candidatures passées dès que
  // l'offre est pourvue par quelqu'un d'autre (constaté en
  // vérification live : la liste redevenait silencieusement vide).
  // Relu via le client admin, seulement pour des offre_id déjà
  // prouvés légitimes par la requête RLS précédente sur ses propres
  // candidatures — même principe que getStatutPaiementMission dans
  // lib/missions.ts (lu, jamais importé).
  const admin = creerClientAdmin();
  const offreIds = [...new Set(candidatures.map((c) => c.offre_id))];
  const [{ data: offres }, { data: journeesRows }] = await Promise.all([
    admin.from("offres").select("*").in("id", offreIds),
    // Mission multi-jours (migration 0062) — journées réelles par
    // offre, regroupées par offre_id ; repli sur l'unique journée de
    // l'offre côté appelant quand une offre n'a pas encore de ligne.
    admin.from("offres_journees").select("offre_id, date, heure_debut, heure_fin").in("offre_id", offreIds).order("date", { ascending: true }),
  ]);
  const offreParId = new Map((offres ?? []).map((o) => [o.id, o]));
  const journeesParOffre = new Map<string, JourneeMission[]>();
  for (const j of journeesRows ?? []) {
    const liste = journeesParOffre.get(j.offre_id) ?? [];
    liste.push({ date: j.date, heureDebut: j.heure_debut.slice(0, 5), heureFin: j.heure_fin.slice(0, 5) });
    journeesParOffre.set(j.offre_id, liste);
  }

  return candidatures
    .filter((c) => offreParId.has(c.offre_id))
    .map((c) => ({ ...c, offre: offreParId.get(c.offre_id)!, journees: journeesParOffre.get(c.offre_id) ?? [] }));
});

/** Documents refusés — seul signal réellement disponible pour bloquer un profil (aucune date d'expiration dans le schéma réel, voir §10.4 dans le rapport final). */
export const getJustificatifsRefuses = cache(async (profilId: string) => {
  const supabase = await creerClientSession();
  const { data } = await supabase.from("justificatifs").select("*").eq("prestataire_id", profilId).eq("statut", "refuse");
  return data ?? [];
});

export const getExceptionsDisponibilites = cache(async (profilId: string) => {
  const supabase = await creerClientSession();
  const { data } = await supabase.from("prestataires_disponibilites_exceptions").select("*").eq("prestataire_id", profilId);
  return data ?? [];
});

export const getExperiences = cache(async (profilId: string) => {
  const supabase = await creerClientSession();
  const { data } = await supabase.from("experiences").select("*").eq("prestataire_id", profilId).order("created_at", { ascending: false });
  return data ?? [];
});

export const getFormations = cache(async (profilId: string) => {
  const supabase = await creerClientSession();
  const { data } = await supabase.from("prestataires_formations").select("*").eq("prestataire_id", profilId).order("annee_obtention", { ascending: false });
  return data ?? [];
});

export const getJustificatifsTous = cache(async (profilId: string) => {
  const supabase = await creerClientSession();
  const { data } = await supabase.from("justificatifs").select("*").eq("prestataire_id", profilId);
  return data ?? [];
});

/** Offres publiées correspondant au métier de ce prestataire, hors offres déjà candidatées. */
export const getOffresCorrespondantes = cache(async (metier: MetierType, profilId: string) => {
  const supabase = await creerClientSession();
  const [{ data: offres }, { data: mesCandidatures }] = await Promise.all([
    supabase.from("offres").select("*").eq("statut", "publiee").eq("metier", metier).order("date_mission", { ascending: true }),
    supabase.from("candidatures").select("offre_id").eq("prestataire_id", profilId),
  ]);
  const idsCandidates = new Set((mesCandidatures ?? []).map((c) => c.offre_id));
  return { offres: offres ?? [], idsCandidates };
});

export const getConversationsPrestataire = cache(async (userId: string, lignes: LigneAvecMission[]): Promise<ConversationPrestataire[]> => {
  if (lignes.length === 0) return [];
  const supabase = await creerClientSession();
  const admin = creerClientAdmin();

  const missionIds = [...new Set(lignes.map((l) => l.mission_id))];
  const [{ data: messages }, { data: missions }] = await Promise.all([
    supabase
      .from("messages")
      .select("mission_id, contenu, created_at, expediteur_id, destinataire_id, type, lu")
      .in("mission_id", missionIds)
      .order("created_at", { ascending: false }),
    supabase.from("missions").select("id, recruteur_id, lieu, date_mission, statut").in("id", missionIds),
  ]);
  const missionParId = new Map((missions ?? []).map((m) => [m.id, m]));

  const idsRecruteurs = [...new Set((missions ?? []).map((m) => m.recruteur_id))];
  const { data: usersRecruteurs } = idsRecruteurs.length > 0 ? await admin.from("users").select("id, prenom, nom").in("id", idsRecruteurs) : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };
  const nomParUserId = new Map((usersRecruteurs ?? []).map((u) => [u.id, `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || "Client"]));

  const conversations: ConversationPrestataire[] = [];
  for (const missionId of missionIds) {
    const mission = missionParId.get(missionId);
    if (!mission) continue;
    const msgs = (messages ?? []).filter((m) => m.mission_id === missionId);
    const dernier = msgs[0];
    conversations.push({
      missionId,
      autreId: mission.recruteur_id,
      autreNom: nomParUserId.get(mission.recruteur_id) ?? "Client",
      lieu: mission.lieu,
      dateMission: mission.date_mission,
      missionStatut: mission.statut,
      dernierMessage: dernier?.contenu ?? null,
      dernierMessageAt: dernier?.created_at ?? null,
      dernierMessageType: dernier?.type ?? null,
      nonLus: msgs.filter((m) => m.destinataire_id === userId && !m.lu).length,
    });
  }
  return conversations.sort((a, b) => {
    if (a.dernierMessageAt && b.dernierMessageAt) return a.dernierMessageAt < b.dernierMessageAt ? 1 : -1;
    if (a.dernierMessageAt) return -1;
    if (b.dernierMessageAt) return 1;
    return a.dateMission < b.dateMission ? 1 : -1;
  });
});
