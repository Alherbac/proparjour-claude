"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/server";
import { creerNotification } from "@/lib/notifications";
import { creerMessageSysteme, creerMessageDevis } from "@/lib/messages";
import { montantAPayer } from "@/app/actions/paiement-mission";
import { heuresEntre } from "@/lib/duree";
import {
  getLigneMissionPrestataire,
  getMissionPourFacture,
  type LigneProposee,
  type MissionAvecLignes,
} from "@/lib/missions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { traduireErreurDb } from "@/lib/erreurs-db";
import { envoyerEmailMissionConfirmee, envoyerEmailPaiementDebloque } from "@/lib/email";

type ActionResult = { success: true } | { success: false; error: string };

const DELAI_ANNULATION_HEURES = 48;

async function getPrestataireUserIds(
  admin: SupabaseClient<Database>,
  missionId: string,
): Promise<string[]> {
  const { data: lignes } = await admin
    .from("mission_lignes")
    .select("prestataire_id")
    .eq("mission_id", missionId);
  const prestataireIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
  if (prestataireIds.length === 0) return [];
  const { data: profils } = await admin
    .from("prestataires_profils")
    .select("user_id")
    .in("id", prestataireIds);
  return (profils ?? []).map((p) => p.user_id);
}

export async function repondreMissionLigne(
  ligneId: string,
  reponse: "acceptee" | "refusee",
): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();

  const { data: ligne, error: ligneError } = await admin
    .from("mission_lignes")
    .select("id, mission_id, prestataire_id, metier, heure_debut, heure_fin, tarif_applique")
    .eq("id", ligneId)
    .maybeSingle();

  if (ligneError || !ligne) {
    return { success: false, error: "Ligne de mission introuvable." };
  }

  const { data: profil } = await admin
    .from("prestataires_profils")
    .select("id")
    .eq("id", ligne.prestataire_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profil) {
    return { success: false, error: "Cette mission ne vous concerne pas." };
  }

  const { error: updateError } = await admin
    .from("mission_lignes")
    .update({ statut_acceptation: reponse })
    .eq("id", ligneId);

  if (updateError) {
    return { success: false, error: traduireErreurDb(updateError, "Impossible d'enregistrer votre réponse pour le moment.") };
  }

  const { data: mission } = await admin
    .from("missions")
    .select("recruteur_id, lieu, date_mission, description")
    .eq("id", ligne.mission_id)
    .maybeSingle();

  if (reponse === "acceptee") {
    const { data: toutesLesLignes } = await admin
      .from("mission_lignes")
      .select("statut_acceptation")
      .eq("mission_id", ligne.mission_id);

    const toutesAcceptees = (toutesLesLignes ?? []).every(
      (l) => l.statut_acceptation === "acceptee",
    );

    if (toutesAcceptees) {
      await admin.from("missions").update({ statut: "confirmee" }).eq("id", ligne.mission_id);
      if (mission) {
        await envoyerEmailMissionConfirmee(mission.recruteur_id, mission.lieu, mission.date_mission, ligne.mission_id);
      }
    }

    // "proparjour 6-7" §8 — mission née du panier → "Proposer la
    // mission" (actions/proposition.ts) : personne n'avait encore
    // consenti à rien, donc aucun devis n'a été envoyé à la création
    // (contrairement à repondreCandidature, où le consentement du
    // prestataire est acquis dès la candidature). Cette première
    // acceptation est donc le tout premier moment où un paiement
    // devient possible — on envoie alors la carte de devis existante
    // (même mécanisme que le parcours candidature, jamais une
    // deuxième UI de paiement) si aucune n'existe déjà pour cette
    // mission. Ne se déclenche jamais sur les missions déjà payées à
    // la création (Refaire une mission / Créer une série) ni sur
    // celles où un devis a déjà été envoyé (parcours candidature) :
    // gardé par paiement 'en_attente' + absence de message 'devis'.
    if (mission) {
      const { data: paiement } = await admin
        .from("paiements")
        .select("statut")
        .eq("mission_id", ligne.mission_id)
        .maybeSingle();
      if (paiement?.statut === "en_attente") {
        const { data: devisExistant } = await admin
          .from("messages")
          .select("id")
          .eq("mission_id", ligne.mission_id)
          .eq("type", "devis")
          .limit(1)
          .maybeSingle();
        if (!devisExistant) {
          const duree = heuresEntre(ligne.heure_debut, ligne.heure_fin);
          const montantTotal = await montantAPayer(admin, ligne.mission_id);
          await creerMessageDevis({
            missionId: ligne.mission_id,
            expediteurId: user.id,
            destinataireId: mission.recruteur_id,
            devis: {
              prestation: mission.description || "Mission proposée",
              date: mission.date_mission,
              heureDebut: ligne.heure_debut,
              heureFin: ligne.heure_fin,
              lieu: mission.lieu,
              tarifHoraire: duree > 0 ? Math.round((ligne.tarif_applique / duree) * 100) / 100 : ligne.tarif_applique,
              montantTotal,
            },
          });
        }
      }
    }
  }

  if (mission) {
    await creerNotification({
      userId: mission.recruteur_id,
      type: reponse === "acceptee" ? "mission_acceptee" : "mission_refusee",
      titre: reponse === "acceptee" ? "Mission acceptée" : "Mission refusée",
      contenu: reponse === "acceptee" ? "Un prestataire a accepté votre mission." : "Un prestataire a refusé votre mission.",
      lien: `/missions/${ligne.mission_id}`,
      missionId: ligne.mission_id,
    });
    await creerMessageSysteme({
      missionId: ligne.mission_id,
      expediteurId: user.id,
      destinataireId: mission.recruteur_id,
      contenu:
        reponse === "acceptee"
          ? "✅ A accepté cette mission."
          : "❌ A refusé cette mission.",
    });
  }

  return { success: true };
}

/**
 * Politique d'annulation fixe (cahier des charges 3.5) : annulation
 * possible jusqu'à 48h avant le début réel de la mission (date +
 * heure de début la plus tôt parmi ses lignes). Passé ce délai, la
 * mission est considérée comme effectuée — le recruteur est facturé
 * en totalité, le prestataire payé comme si la mission avait eu lieu.
 */
export async function annulerMission(missionId: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();

  const { data: mission } = await admin
    .from("missions")
    .select("id, recruteur_id, statut, date_mission")
    .eq("id", missionId)
    .maybeSingle();

  if (!mission || mission.recruteur_id !== user.id) {
    return { success: false, error: "Mission introuvable." };
  }
  if (mission.statut === "annulee" || mission.statut === "terminee" || mission.statut === "litige") {
    return { success: false, error: "Cette mission ne peut plus être annulée." };
  }

  const { data: lignes } = await admin
    .from("mission_lignes")
    .select("heure_debut")
    .eq("mission_id", missionId);

  const heureDebutMin = [...(lignes ?? [])].map((l) => l.heure_debut).sort()[0] ?? "00:00:00";
  const debutMission = new Date(`${mission.date_mission}T${heureDebutMin}`);
  const heuresRestantes = (debutMission.getTime() - Date.now()) / 3_600_000;

  if (heuresRestantes < DELAI_ANNULATION_HEURES) {
    return {
      success: false,
      error: `Annulation impossible : la mission a lieu dans moins de ${DELAI_ANNULATION_HEURES}h. Elle est considérée comme effectuée.`,
    };
  }

  const { error: updateError } = await admin
    .from("missions")
    .update({ statut: "annulee" })
    .eq("id", missionId);
  if (updateError) {
    return { success: false, error: traduireErreurDb(updateError, "Impossible d'annuler cette mission pour le moment.") };
  }

  const { data: paiement } = await admin
    .from("paiements")
    .select("stripe_payment_intent_id")
    .eq("mission_id", missionId)
    .maybeSingle();

  // Le statut `rembourse` n'est écrit qu'une fois le remboursement
  // Stripe réellement confirmé — jamais avant, pour ne pas afficher au
  // recruteur un remboursement qui n'a pas réellement eu lieu (carte
  // expirée, Stripe indisponible, etc.). Si aucun paiement Stripe
  // n'existe (clé pas encore configurée à l'époque du paiement), il
  // n'y a rien à rembourser côté Stripe : le statut DB peut refléter
  // l'annulation directement.
  if (paiement?.stripe_payment_intent_id) {
    try {
      const stripe = getStripeClient();
      await stripe.refunds.create({ payment_intent: paiement.stripe_payment_intent_id });
      await admin
        .from("paiements")
        .update({ statut: "rembourse", date_deblocage: new Date().toISOString() })
        .eq("mission_id", missionId);
    } catch {
      // La mission reste annulée (le recruteur ne sera plus facturé
      // pour rien de plus). Le paiement bascule sur `echec` — jamais
      // laissé silencieusement à `sequestre` — pour apparaître dans le
      // KPI admin dédié (lib/admin/dashboard.ts) et dans l'écran de
      // suivi des versements (module Finances) : à réconcilier
      // manuellement depuis l'admin plutôt que de rester invisible.
      await admin.from("paiements").update({ statut: "echec" }).eq("mission_id", missionId);
    }
  } else {
    await admin
      .from("paiements")
      .update({ statut: "rembourse", date_deblocage: new Date().toISOString() })
      .eq("mission_id", missionId);
  }

  const prestataireUserIds = await getPrestataireUserIds(admin, missionId);
  await Promise.all(
    prestataireUserIds.map((userId) =>
      Promise.all([
        creerNotification({
          userId,
          type: "mission_annulee",
          titre: "Mission annulée",
          contenu: `La mission du ${mission.date_mission} a été annulée par le recruteur.`,
          lien: `/missions/${missionId}`,
          missionId,
        }),
        creerMessageSysteme({
          missionId,
          expediteurId: user.id,
          destinataireId: userId,
          contenu: "❌ Le client a annulé cette mission.",
        }),
      ]),
    ),
  );

  return { success: true };
}

/**
 * Le prestataire déclare le service fait sur sa propre ligne de
 * mission (cahier des charges 3.9, étape 4) — pas avant le jour de la
 * mission, pas avant d'avoir accepté sa ligne.
 */
export async function declarerServiceFaitLigne(ligneId: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();

  const { data: ligne } = await admin
    .from("mission_lignes")
    .select("id, mission_id, prestataire_id, statut_acceptation, service_fait")
    .eq("id", ligneId)
    .maybeSingle();

  if (!ligne) {
    return { success: false, error: "Ligne de mission introuvable." };
  }

  const { data: profil } = await admin
    .from("prestataires_profils")
    .select("id")
    .eq("id", ligne.prestataire_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profil) {
    return { success: false, error: "Cette mission ne vous concerne pas." };
  }

  if (ligne.statut_acceptation !== "acceptee") {
    return { success: false, error: "Vous devez d'abord accepter cette mission." };
  }
  if (ligne.service_fait) {
    return { success: true };
  }

  const { data: mission } = await admin
    .from("missions")
    .select("recruteur_id, statut, date_mission")
    .eq("id", ligne.mission_id)
    .maybeSingle();
  if (!mission) {
    return { success: false, error: "Mission introuvable." };
  }
  if (mission.statut !== "confirmee" && mission.statut !== "en_cours") {
    return { success: false, error: "Cette mission n'est pas dans un état permettant cette déclaration." };
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);
  if (mission.date_mission > aujourdhui) {
    return { success: false, error: "Vous ne pouvez déclarer le service fait qu'à partir du jour de la mission." };
  }

  const { error } = await admin
    .from("mission_lignes")
    .update({ service_fait: true })
    .eq("id", ligneId);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer cette déclaration pour le moment.") };
  }

  await admin.from("missions").update({ statut: "en_cours" }).eq("id", ligne.mission_id).eq("statut", "confirmee");

  await creerNotification({
    userId: mission.recruteur_id,
    type: "service_fait_declare",
    titre: "Service fait déclaré",
    contenu: "Un prestataire a déclaré avoir effectué sa mission.",
    lien: `/missions/${ligne.mission_id}`,
    missionId: ligne.mission_id,
  });
  await creerMessageSysteme({
    missionId: ligne.mission_id,
    expediteurId: user.id,
    destinataireId: mission.recruteur_id,
    contenu: "✅ A déclaré le service terminé.",
  });

  return { success: true };
}

/**
 * Le recruteur confirme que le service a bien été rendu (cahier des
 * charges 3.9, étape 5) — débloque le paiement séquestré, commission
 * déduite. Le recruteur peut confirmer même si un prestataire n'a pas
 * lui-même déclaré sa ligne (cahier : "le prestataire et/ou le
 * recruteur"), sa confirmation fait foi.
 */
export async function confirmerServiceFait(missionId: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();

  const { data: mission } = await admin
    .from("missions")
    .select("id, recruteur_id, statut")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission || mission.recruteur_id !== user.id) {
    return { success: false, error: "Mission introuvable." };
  }
  if (mission.statut !== "confirmee" && mission.statut !== "en_cours") {
    return { success: false, error: "Cette mission n'est pas dans un état permettant cette confirmation." };
  }

  await admin.from("mission_lignes").update({ service_fait: true }).eq("mission_id", missionId);

  const { error: missionError } = await admin
    .from("missions")
    .update({ statut: "terminee", service_fait: true })
    .eq("id", missionId);
  if (missionError) {
    return { success: false, error: traduireErreurDb(missionError, "Impossible de confirmer cette mission pour le moment.") };
  }

  const { error: paiementError } = await admin
    .from("paiements")
    .update({ statut: "libere", date_deblocage: new Date().toISOString() })
    .eq("mission_id", missionId);
  if (paiementError) {
    return { success: false, error: traduireErreurDb(paiementError, "Impossible de débloquer le paiement pour le moment.") };
  }

  const prestataireUserIds = await getPrestataireUserIds(admin, missionId);
  await Promise.all(
    prestataireUserIds.map((userId) =>
      Promise.all([
        creerNotification({
          userId,
          type: "paiement_libere",
          titre: "Paiement débloqué",
          contenu: "Le recruteur a confirmé le service fait, votre paiement a été débloqué.",
          lien: `/missions/${missionId}`,
          missionId,
        }),
        envoyerEmailPaiementDebloque(userId, missionId),
        creerMessageSysteme({
          missionId,
          expediteurId: user.id,
          destinataireId: userId,
          contenu: "✅ Le client a confirmé le service fait. Paiement débloqué.",
        }),
      ]),
    ),
  );

  return { success: true };
}

/**
 * Le recruteur conteste la réalisation du service : la mission
 * bascule en litige, arbitrable depuis le tableau de bord admin
 * (Étape 9, pas encore construit — la contestation est capturée dès
 * maintenant pour ne pas perdre l'information).
 */
export async function contesterMission(missionId: string, motif: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }
  if (!motif.trim()) {
    return { success: false, error: "Merci de préciser le motif de la contestation." };
  }

  const admin = createAdminClient();

  const { data: mission } = await admin
    .from("missions")
    .select("id, recruteur_id, statut")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission || mission.recruteur_id !== user.id) {
    return { success: false, error: "Mission introuvable." };
  }
  if (mission.statut !== "confirmee" && mission.statut !== "en_cours") {
    return { success: false, error: "Cette mission n'est pas dans un état permettant une contestation." };
  }

  const { error } = await admin
    .from("missions")
    .update({ statut: "litige", motif_litige: motif.trim() })
    .eq("id", missionId);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible d'ouvrir la contestation pour le moment.") };
  }

  const prestataireUserIds = await getPrestataireUserIds(admin, missionId);
  await Promise.all(
    prestataireUserIds.map((userId) =>
      Promise.all([
        creerNotification({
          userId,
          type: "litige",
          titre: "Mission contestée",
          contenu: "Le recruteur a contesté la réalisation de cette mission.",
          lien: `/missions/${missionId}`,
          missionId,
        }),
        creerMessageSysteme({
          missionId,
          expediteurId: user.id,
          destinataireId: userId,
          contenu: `⚠️ Le client conteste cette mission : ${motif.trim()}`,
        }),
      ]),
    ),
  );

  return { success: true };
}

/**
 * Synchronisation temps réel (Phase 3) : appelées par les tableaux
 * de bord client quand une notification liée à une mission arrive
 * sur le canal Realtime déjà en place, pour ne rafraîchir que la
 * carte concernée — jamais toute la liste. Chacune s'appuie sur la
 * RLS (via le client session dans les fonctions lib appelées) :
 * impossible de récupérer la mission d'un autre utilisateur en
 * passant un id arbitraire.
 */
export async function rafraichirLignePrestataire(missionId: string): Promise<LigneProposee | null> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) return null;
  return getLigneMissionPrestataire(user.id, missionId);
}

export async function rafraichirMissionRecruteur(missionId: string): Promise<MissionAvecLignes | null> {
  return getMissionPourFacture(missionId);
}
