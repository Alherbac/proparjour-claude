"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/server";
import { creerNotification } from "@/lib/notifications";
import { creerMessageSysteme, creerMessageDevis } from "@/lib/messages";
import { detecterCoordonnees, messageCoordonneesBloquees } from "@/lib/coordonnees-interdites";
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
 * Le prestataire propose son devis dans la conversation, après avoir
 * échangé avec le client — jamais l'inverse (voir repondreCandidature,
 * actions/offres.ts, qui n'envoie plus de devis automatique depuis la
 * correction UX critique du parcours candidature). Part toujours à
 * "en_attente" : c'est le client qui l'accepte explicitement
 * (accepterDevis) avant que le paiement ne devienne possible.
 */
export async function envoyerDevis(
  missionId: string,
  destinataireId: string,
  devis: { prestation: string; date: string; heureDebut: string; heureFin: string; lieu: string; tarifHoraire: number; montantTotal: number },
): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();

  const { data: profil } = await admin.from("prestataires_profils").select("id").eq("user_id", user.id).maybeSingle();
  if (!profil) {
    return { success: false, error: "Seul un prestataire peut envoyer un devis." };
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

  const { data: devisExistant } = await admin
    .from("messages")
    .select("id, metadata")
    .eq("mission_id", missionId)
    .eq("expediteur_id", user.id)
    .eq("destinataire_id", destinataireId)
    .eq("type", "devis")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const statutExistant = (devisExistant?.metadata as { statut?: string } | null)?.statut;
  if (devisExistant && statutExistant !== "ajustement_demande") {
    return { success: false, error: "Un devis est déjà en attente de réponse pour cette conversation." };
  }

  // Même contrôle serveur que pour les messages libres (voir
  // envoyerMessage, actions/messages.ts) : la prestation et le lieu
  // sont les deux seuls champs libres d'un devis, jamais bloqué sur
  // les champs contraints (date, horaires, tarif).
  for (const champ of [devis.prestation, devis.lieu]) {
    const coordonnees = detecterCoordonnees(champ);
    if (coordonnees) {
      return { success: false, error: messageCoordonneesBloquees(coordonnees) };
    }
  }

  await creerMessageDevis({
    missionId,
    expediteurId: user.id,
    destinataireId,
    devis: { ...devis, statut: "en_attente" },
  });

  await creerNotification({
    userId: destinataireId,
    type: "devis_envoye",
    titre: "Devis reçu",
    contenu: `${devis.prestation} — ${devis.montantTotal} €`,
    lien: `/missions/${missionId}`,
    missionId,
  });

  revalidatePath(`/missions/${missionId}`);
  return { success: true };
}

type MessageDevis = {
  id: string;
  mission_id: string;
  expediteur_id: string;
  destinataire_id: string;
  type: string;
  metadata: unknown;
};

/**
 * Vrai seulement si `message` est le devis le plus récent échangé
 * entre ce binôme expéditeur/destinataire sur cette mission — jamais
 * confié à l'interface (qui ne rend de toute façon que la dernière
 * carte comme "actionnable"), revérifié ici pour qu'une ancienne
 * version ne puisse jamais être acceptée/ajustée/déclinée après coup
 * (référence directe conservée, appel API rejoué, etc.).
 */
async function estDevisActif(admin: SupabaseClient<Database>, message: MessageDevis): Promise<boolean> {
  const { data: dernier } = await admin
    .from("messages")
    .select("id")
    .eq("mission_id", message.mission_id)
    .eq("expediteur_id", message.expediteur_id)
    .eq("destinataire_id", message.destinataire_id)
    .eq("type", "devis")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return dernier?.id === message.id;
}

/**
 * Charge un message-devis et vérifie que `userId` est bien celui à
 * qui répondre revient. `role` distingue les deux sens de réponse
 * possibles sur un devis : le CLIENT (destinataire) répond à un devis
 * "en_attente" (accepter / ajuster / décliner) ; le PRESTATAIRE
 * (expéditeur) ne reprend la main que sur un devis "ajustement_demande"
 * (nouveau devis, ou décliner — voir declinerDevis). Revérifie aussi
 * que ce devis est bien l'actif (voir estDevisActif) et que son statut
 * courant correspond à ce que l'appelant attend, pour ne jamais agir
 * sur un devis déjà répondu ou remplacé.
 */
async function getMessageDevisPourReponse(
  admin: SupabaseClient<Database>,
  messageId: string,
  userId: string,
  role: "destinataire" | "expediteur",
  statutAttendu: string,
): Promise<{ ok: true; message: MessageDevis } | { ok: false; error: string }> {
  const { data: message } = await admin
    .from("messages")
    .select("id, mission_id, expediteur_id, destinataire_id, type, metadata")
    .eq("id", messageId)
    .maybeSingle();
  if (!message || message.type !== "devis") return { ok: false, error: "Devis introuvable." };

  const idAttendu = role === "destinataire" ? message.destinataire_id : message.expediteur_id;
  if (idAttendu !== userId) return { ok: false, error: "Ce devis ne vous est pas adressé." };

  if (!(await estDevisActif(admin, message))) {
    return { ok: false, error: "Ce devis n'est plus la version active de la négociation." };
  }

  const statutActuel = (message.metadata as { statut?: string } | null)?.statut ?? "acceptee";
  if (statutActuel !== statutAttendu) {
    return { ok: false, error: "Ce devis a déjà reçu une réponse." };
  }

  return { ok: true, message };
}

/**
 * Acceptation explicite du devis par le client — action distincte de
 * "Retenir" une candidature (voir repondreCandidature) : c'est ici,
 * et seulement ici, que le paiement devient possible (voir
 * missions/[id]/page.tsx, aUnDevisAccepte).
 */
export async function accepterDevis(messageId: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();
  const resultat = await getMessageDevisPourReponse(admin, messageId, user.id, "destinataire", "en_attente");
  if (!resultat.ok) {
    return { success: false, error: resultat.error };
  }
  const { message } = resultat;

  const { error } = await admin
    .from("messages")
    .update({ metadata: { ...(message.metadata as object), statut: "acceptee" } })
    .eq("id", messageId);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible d'accepter ce devis pour le moment.") };
  }

  // Le montant réellement facturé (montantAPayer, actions/paiement-mission.ts)
  // vient de mission_lignes.tarif_applique, jamais relu depuis le devis
  // au moment du paiement — sans cette mise à jour, un devis négocié à
  // la baisse (ou à la hausse) après un ajustement n'aurait aucun effet
  // sur ce que le client paie réellement : bug trouvé en vérification
  // live, corrigé ici plutôt que dans montantAPayer pour que la ligne
  // reflète, à tout moment, les derniers termes réellement acceptés.
  const devisAccepte = message.metadata as { montantTotal?: number } | null;
  if (typeof devisAccepte?.montantTotal === "number") {
    const { data: profilPrestataire } = await admin
      .from("prestataires_profils")
      .select("id")
      .eq("user_id", message.expediteur_id)
      .maybeSingle();
    if (profilPrestataire) {
      await admin
        .from("mission_lignes")
        .update({ tarif_applique: devisAccepte.montantTotal })
        .eq("mission_id", message.mission_id)
        .eq("prestataire_id", profilPrestataire.id);
    }

    // Même correctif pour l'onglet "Détail" (voir detail-mission-tabs.tsx,
    // qui lit paiements.montant/montant_commission — un panneau
    // d'affichage séparé de mission_lignes, sinon toujours désynchronisé
    // du montant réellement payable après une négociation.
    const { data: paiementExistant } = await admin
      .from("paiements")
      .select("taux_commission")
      .eq("mission_id", message.mission_id)
      .maybeSingle();
    if (paiementExistant) {
      const nouvelleCommission = Math.round(devisAccepte.montantTotal * (paiementExistant.taux_commission / 100) * 100) / 100;
      await admin
        .from("paiements")
        .update({ montant: devisAccepte.montantTotal, montant_commission: nouvelleCommission })
        .eq("mission_id", message.mission_id);
    }
  }

  await creerMessageSysteme({
    missionId: message.mission_id,
    expediteurId: user.id,
    destinataireId: message.expediteur_id,
    contenu: "✅ A accepté le devis.",
  });
  await creerNotification({
    userId: message.expediteur_id,
    type: "devis_accepte",
    titre: "Devis accepté",
    contenu: "Le client a accepté votre devis — en attente de paiement.",
    lien: `/missions/${message.mission_id}`,
    missionId: message.mission_id,
  });

  revalidatePath(`/missions/${message.mission_id}`);
  return { success: true };
}

/**
 * Le client demande un ajustement plutôt que d'accepter tel quel — le
 * prestataire peut alors envoyer un nouveau devis dans le même fil
 * (envoyerDevis l'autorise tant que le dernier est à "ajustement_demande").
 */
export async function demanderAjustementDevis(messageId: string, note: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();
  const resultat = await getMessageDevisPourReponse(admin, messageId, user.id, "destinataire", "en_attente");
  if (!resultat.ok) {
    return { success: false, error: resultat.error };
  }
  const { message } = resultat;
  const noteTrimmed = note.trim().slice(0, 500);

  const { error } = await admin
    .from("messages")
    .update({
      metadata: { ...(message.metadata as object), statut: "ajustement_demande", noteAjustement: noteTrimmed || undefined },
    })
    .eq("id", messageId);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible d'envoyer votre demande pour le moment.") };
  }

  await creerMessageSysteme({
    missionId: message.mission_id,
    expediteurId: user.id,
    destinataireId: message.expediteur_id,
    contenu: noteTrimmed ? `✏️ A demandé un ajustement du devis : « ${noteTrimmed} »` : "✏️ A demandé un ajustement du devis.",
  });
  await creerNotification({
    userId: message.expediteur_id,
    type: "devis_ajustement_demande",
    titre: "Ajustement demandé",
    contenu: noteTrimmed || "Le client souhaite un ajustement de votre devis.",
    lien: `/missions/${message.mission_id}`,
    missionId: message.mission_id,
  });

  revalidatePath(`/missions/${message.mission_id}`);
  return { success: true };
}

/**
 * Décliner un devis — deux cas, symétriques (voir §2 "DEVIS / DEVIS —
 * WORKFLOW COMPLET") :
 *  - le CLIENT décline un devis fraîchement reçu ("en_attente"), sans
 *    passer par une demande d'ajustement ;
 *  - le PRESTATAIRE, après avoir reçu une demande d'ajustement
 *    ("ajustement_demande"), choisit de ne pas en renvoyer un plutôt
 *    que de reprendre la main avec une nouvelle version.
 * Dans les deux cas, le devis passe à "refusee" — un statut terminal :
 * envoyerDevis n'autorise un nouveau devis que si le dernier est
 * "ajustement_demande", jamais "refusee", donc la négociation s'arrête
 * réellement là. Ni la mission ni la candidature ne sont annulées ici
 * (aucune des deux parties n'est encore engagée à ce stade — voir
 * repondreCandidature, actions/offres.ts) : c'est au recruteur
 * d'annuler la mission séparément (annulerMission) s'il le souhaite.
 */
export async function declinerDevis(messageId: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const admin = createAdminClient();
  const { data: message } = await admin
    .from("messages")
    .select("id, mission_id, expediteur_id, destinataire_id, type, metadata")
    .eq("id", messageId)
    .maybeSingle();
  if (!message || message.type !== "devis") {
    return { success: false, error: "Devis introuvable." };
  }

  const estClient = message.destinataire_id === user.id;
  const estPrestataire = message.expediteur_id === user.id;
  if (!estClient && !estPrestataire) {
    return { success: false, error: "Ce devis ne vous concerne pas." };
  }

  if (!(await estDevisActif(admin, message))) {
    return { success: false, error: "Ce devis n'est plus la version active de la négociation." };
  }

  const statutActuel = (message.metadata as { statut?: string } | null)?.statut ?? "acceptee";
  const autoriseClient = estClient && statutActuel === "en_attente";
  const autorisePrestataire = estPrestataire && statutActuel === "ajustement_demande";
  if (!autoriseClient && !autorisePrestataire) {
    return { success: false, error: "Ce devis ne peut pas être décliné dans son état actuel." };
  }

  const { error } = await admin
    .from("messages")
    .update({ metadata: { ...(message.metadata as object), statut: "refusee" } })
    .eq("id", messageId);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible de décliner ce devis pour le moment.") };
  }

  const destinataireNotif = estClient ? message.expediteur_id : message.destinataire_id;
  await creerMessageSysteme({
    missionId: message.mission_id,
    expediteurId: user.id,
    destinataireId: destinataireNotif,
    contenu: estClient ? "❌ A décliné le devis." : "❌ Le professionnel a décliné la demande d'ajustement.",
  });
  await creerNotification({
    userId: destinataireNotif,
    type: "devis_refuse",
    titre: "Devis décliné",
    contenu: estClient ? "Le client a décliné votre devis." : "Le professionnel ne donnera pas suite à votre demande d'ajustement.",
    lien: `/missions/${message.mission_id}`,
    missionId: message.mission_id,
  });

  revalidatePath(`/missions/${message.mission_id}`);
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

const CHAMPS_INFORMATIONS_MISSION = ["modalites_acces", "contact_sur_place", "consignes_particulieres"] as const;
type ChampInformationMission = (typeof CHAMPS_INFORMATIONS_MISSION)[number];

/**
 * Carte "Informations manquantes" du Détail mission (dossier design) —
 * migration 0042. Seul le recruteur de la mission peut compléter ces
 * champs, réservés au client (le prestataire les consulte via le
 * contexte/la messagerie, jamais éditables de son côté).
 */
export async function mettreAJourInformationsMission(
  missionId: string,
  champ: ChampInformationMission,
  valeur: string,
): Promise<ActionResult> {
  if (!CHAMPS_INFORMATIONS_MISSION.includes(champ)) {
    return { success: false, error: "Champ inconnu." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { data: mission } = await supabase.from("missions").select("recruteur_id").eq("id", missionId).maybeSingle();
  if (!mission || mission.recruteur_id !== user.id) {
    return { success: false, error: "Mission introuvable." };
  }

  const valeurNettoyee = valeur.trim() || null;
  const requete =
    champ === "modalites_acces"
      ? supabase.from("missions").update({ modalites_acces: valeurNettoyee })
      : champ === "contact_sur_place"
        ? supabase.from("missions").update({ contact_sur_place: valeurNettoyee })
        : supabase.from("missions").update({ consignes_particulieres: valeurNettoyee });
  const { error } = await requete.eq("id", missionId);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible d'enregistrer cette information pour le moment.") };
  }

  revalidatePath(`/missions/${missionId}`);
  return { success: true };
}
