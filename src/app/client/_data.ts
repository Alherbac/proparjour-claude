import "server-only";
import { cache } from "react";
import { creerClientSession, creerClientAdmin } from "@/app/client/_supabase";
import type { SessionClient, MissionAvecEquipe, OffreAvecCandidatures, ConversationClient } from "@/app/client/_types";

/**
 * Couche de données propre à /client — Règle N°0 : écrite de zéro,
 * aucune requête copiée d'un fichier existant. Chaque quantité
 * affichée dans plusieurs écrans (§6.a) est calculée UNE SEULE FOIS
 * ici et réutilisée partout où elle apparaît (badge de nav, résumé
 * d'en-tête, ligne "À faire maintenant", carte d'indicateur) — jamais
 * recalculée séparément à un second endroit. Les types et fonctions
 * pures dérivées de ces données vivent dans _types.ts, importable
 * depuis un composant client (ce module-ci ne l'est pas : "server-only").
 */
export * from "@/app/client/_types";

export const getSessionClient = cache(async (): Promise<SessionClient | null> => {
  const supabase = await creerClientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase.from("users").select("*").eq("id", user.id).maybeSingle();
  if (!profil || (profil.type !== "recruteur_entreprise" && profil.type !== "recruteur_particulier")) return null;

  const { data: entreprise } =
    profil.type === "recruteur_entreprise"
      ? await supabase.from("entreprises").select("*").eq("user_id", user.id).maybeSingle()
      : { data: null };

  return { userId: user.id, email: user.email ?? "", profil, entreprise };
});

/** Toutes les missions du recruteur connecté, équipe affectée et paiement inclus — source unique pour Vue d'ensemble ET Vos missions. */
export const getMissionsClient = cache(async (userId: string): Promise<MissionAvecEquipe[]> => {
  const supabase = await creerClientSession();
  const admin = creerClientAdmin();

  const { data: missions } = await supabase.from("missions").select("*").eq("recruteur_id", userId).order("date_mission", { ascending: false });
  if (!missions || missions.length === 0) return [];

  const missionIds = missions.map((m) => m.id);
  const [{ data: lignes }, { data: paiements }, { data: derniersMessages }] = await Promise.all([
    supabase.from("mission_lignes").select("*").in("mission_id", missionIds),
    supabase.from("paiements").select("mission_id, statut, montant").in("mission_id", missionIds),
    supabase.from("messages").select("mission_id, type, created_at").in("mission_id", missionIds).order("created_at", { ascending: false }),
  ]);

  const prestataireIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
  const { data: prestataires } =
    prestataireIds.length > 0
      ? await admin.from("prestataires_profils").select("id, user_id").in("id", prestataireIds)
      : { data: [] as { id: string; user_id: string }[] };
  const userIdsPrestataires = [...new Set((prestataires ?? []).map((p) => p.user_id))];
  const { data: usersPrestataires } =
    userIdsPrestataires.length > 0
      ? await admin.from("users").select("id, prenom, nom").in("id", userIdsPrestataires)
      : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };
  const nomParProfilId = new Map(
    (prestataires ?? []).map((p) => {
      const u = (usersPrestataires ?? []).find((uu) => uu.id === p.user_id);
      return [p.id, { prenom: u?.prenom ?? null, nom: u?.nom ?? null }];
    }),
  );
  const paiementParMission = new Map((paiements ?? []).map((p) => [p.mission_id, p]));
  const dernierMessageParMission = new Map<string, "texte" | "systeme" | "devis">();
  for (const m of derniersMessages ?? []) {
    if (!dernierMessageParMission.has(m.mission_id)) dernierMessageParMission.set(m.mission_id, m.type);
  }

  return missions.map((m) => ({
    ...m,
    paiement: paiementParMission.get(m.id) ?? null,
    dernierMessageType: dernierMessageParMission.get(m.id) ?? null,
    lignes: (lignes ?? [])
      .filter((l) => l.mission_id === m.id)
      .map((l) => ({ ...l, ...(nomParProfilId.get(l.prestataire_id) ?? { prenom: null, nom: null }) })),
  }));
});

/** Toutes les offres du recruteur avec leurs candidatures détaillées — source unique pour Vue d'ensemble ET Candidatures reçues. */
export const getOffresAvecCandidatures = cache(async (userId: string): Promise<OffreAvecCandidatures[]> => {
  const supabase = await creerClientSession();
  const admin = creerClientAdmin();

  const { data: offres } = await supabase.from("offres").select("*").eq("recruteur_id", userId).order("created_at", { ascending: false });
  if (!offres || offres.length === 0) return [];

  const offreIds = offres.map((o) => o.id);
  const { data: candidatures } = await supabase.from("candidatures").select("*").in("offre_id", offreIds).order("created_at", { ascending: false });
  const prestataireIds = [...new Set((candidatures ?? []).map((c) => c.prestataire_id))];
  const { data: profils } =
    prestataireIds.length > 0
      ? await admin
          .from("prestataires_profils")
          .select("id, user_id, photo_url, tarif_montant, tarif_type, statut_verification, certifications")
          .in("id", prestataireIds)
      : { data: [] as { id: string; user_id: string; photo_url: string | null; tarif_montant: number; tarif_type: string; statut_verification: string; certifications: string[] }[] };
  const userIdsCandidats = [...new Set((profils ?? []).map((p) => p.user_id))];
  const { data: usersCandidats } =
    userIdsCandidats.length > 0
      ? await admin.from("users").select("id, prenom, nom").in("id", userIdsCandidats)
      : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };

  const profilParId = new Map((profils ?? []).map((p) => [p.id, p]));
  const userParId = new Map((usersCandidats ?? []).map((u) => [u.id, u]));

  return offres.map((offre) => ({
    ...offre,
    candidatures: (candidatures ?? [])
      .filter((c) => c.offre_id === offre.id)
      .map((c) => {
        const profil = profilParId.get(c.prestataire_id);
        const u = profil ? userParId.get(profil.user_id) : undefined;
        return {
          ...c,
          prenom: u?.prenom ?? null,
          nom: u?.nom ?? null,
          photoUrl: profil?.photo_url ?? null,
          tarifMontant: profil?.tarif_montant ?? 0,
          tarifType: profil?.tarif_type ?? "journalier",
          statutVerification: profil?.statut_verification ?? "en_attente",
          certifications: profil?.certifications ?? [],
        };
      }),
  }));
});

/** Une conversation par (mission, prestataire) — même principe que la messagerie déjà réelle du site, réécrit ici sans import. */
export const getConversationsClient = cache(async (userId: string, missions: MissionAvecEquipe[]): Promise<ConversationClient[]> => {
  if (missions.length === 0) return [];
  const supabase = await creerClientSession();
  const admin = creerClientAdmin();

  const missionIds = missions.map((m) => m.id);
  const { data: messages } = await supabase
    .from("messages")
    .select("mission_id, contenu, created_at, expediteur_id, destinataire_id, type, lu")
    .in("mission_id", missionIds)
    .order("created_at", { ascending: false });

  // Les prestataires affectés sont identifiés par leur prestataires_profils.id
  // dans mission_lignes, mais les messages utilisent leur users.id — il
  // faut les deux annuaires pour retrouver le bon nom dans chaque cas.
  const profilIdsAffectes = [...new Set(missions.flatMap((m) => m.lignes.map((l) => l.prestataire_id)))];
  const { data: profilsAffectes } =
    profilIdsAffectes.length > 0
      ? await admin.from("prestataires_profils").select("id, user_id").in("id", profilIdsAffectes)
      : { data: [] as { id: string; user_id: string }[] };
  const userIdParProfilId = new Map((profilsAffectes ?? []).map((p) => [p.id, p.user_id]));

  const idsPartenairesPossibles = new Set<string>();
  for (const msg of messages ?? []) idsPartenairesPossibles.add(msg.expediteur_id === userId ? msg.destinataire_id : msg.expediteur_id);
  for (const uid of userIdParProfilId.values()) idsPartenairesPossibles.add(uid);
  const { data: usersPartenaires } =
    idsPartenairesPossibles.size > 0
      ? await admin.from("users").select("id, prenom, nom").in("id", [...idsPartenairesPossibles])
      : { data: [] as { id: string; prenom: string | null; nom: string | null }[] };
  const nomParUserId = new Map(
    (usersPartenaires ?? []).map((u) => [u.id, `${u.prenom ?? ""} ${u.nom ?? ""}`.trim() || "Professionnel"]),
  );

  const conversations: ConversationClient[] = [];
  for (const m of missions) {
    const msgsMission = (messages ?? []).filter((msg) => msg.mission_id === m.id);
    const parPartenaire = new Map<string, typeof msgsMission>();
    for (const msg of msgsMission) {
      const autre = msg.expediteur_id === userId ? msg.destinataire_id : msg.expediteur_id;
      if (!parPartenaire.has(autre)) parPartenaire.set(autre, []);
      parPartenaire.get(autre)!.push(msg);
    }
    // Aucun message échangé pour l'instant sur cette mission : on
    // affiche quand même une entrée par prestataire affecté, sinon
    // une mission fraîchement créée n'apparaît nulle part.
    const partenaires =
      parPartenaire.size > 0
        ? [...parPartenaire.keys()]
        : [...new Set(m.lignes.map((l) => userIdParProfilId.get(l.prestataire_id)).filter((v): v is string => Boolean(v)))];

    for (const autreUserId of partenaires) {
      const msgs = parPartenaire.get(autreUserId) ?? [];
      const dernier = msgs[0];
      conversations.push({
        missionId: m.id,
        autreId: autreUserId,
        autreNom: nomParUserId.get(autreUserId) ?? "Professionnel",
        lieu: m.lieu,
        dateMission: m.date_mission,
        missionStatut: m.statut,
        dernierMessage: dernier?.contenu ?? null,
        dernierMessageAt: dernier?.created_at ?? null,
        dernierMessageType: dernier?.type ?? null,
        nonLus: msgs.filter((msg) => msg.destinataire_id === userId && !msg.lu).length,
      });
    }
  }
  return conversations.sort((a, b) => {
    if (a.dernierMessageAt && b.dernierMessageAt) return a.dernierMessageAt < b.dernierMessageAt ? 1 : -1;
    if (a.dernierMessageAt) return -1;
    if (b.dernierMessageAt) return 1;
    return a.dateMission < b.dateMission ? 1 : -1;
  });
});
