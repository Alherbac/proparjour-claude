"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/server";
import { creerNotification } from "@/lib/notifications";
import { creerMessageSysteme } from "@/lib/messages";
import { verifierLimiteDebit } from "@/lib/rate-limit";
import { traduireErreurDb } from "@/lib/erreurs-db";
import { repartitionLigne, type RepartitionLigne } from "@/lib/facturation";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

/**
 * Somme des lignes réellement acceptées à cet instant — jamais le
 * montant figé de `paiements.montant` (qui reflète la proposition
 * initiale, potentiellement plus large qu'au parcours candidature :
 * voir "proparjour 6-7" §8, panier → "Proposer la mission", où
 * plusieurs professionnels peuvent être proposés sans avoir encore
 * tous répondu). Pour une mission née de retenirCandidature (une
 * seule ligne, déjà 'acceptee' à la création), retombe exactement sur
 * le montant déjà stocké — aucune régression sur ce chemin existant.
 */
export async function montantAPayer(admin: ReturnType<typeof createAdminClient>, missionId: string): Promise<number> {
  const { data: lignes } = await admin
    .from("mission_lignes")
    .select("tarif_applique")
    .eq("mission_id", missionId)
    .eq("statut_acceptation", "acceptee");
  const total = (lignes ?? []).reduce((somme, l) => somme + l.tarif_applique, 0);
  return Math.round(total * 100) / 100;
}

/**
 * Paiement inline dans la conversation (Bloc 9) — contrepartie de
 * creerIntentionPaiement (actions/commande.ts) mais pour une mission
 * déjà créée (par retenirCandidature ou, depuis "proparjour 6-7",
 * par proposerMission), avec son paiement `en_attente` déjà en base.
 * Le montant est recalculé à chaque appel depuis les lignes
 * réellement acceptées (voir montantAPayer) plutôt que lu tel quel
 * dans `paiements.montant` — nécessaire dès qu'une mission peut avoir
 * plusieurs lignes partiellement acceptées, ce qui n'existait pas
 * avant ce chantier.
 */
export async function creerIntentionPaiementMission(
  missionId: string,
): Promise<ActionResult<{ clientSecret: string; montant: number }>> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  if (!(await verifierLimiteDebit(`paiement:${user.id}`, 10, 10 * 60))) {
    return { success: false, error: "Trop de tentatives de paiement. Réessayez dans quelques minutes." };
  }

  const { data: mission } = await supabaseServer
    .from("missions")
    .select("id, recruteur_id")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission || mission.recruteur_id !== user.id) {
    return { success: false, error: "Mission introuvable." };
  }

  const admin = createAdminClient();
  const { data: paiement } = await admin
    .from("paiements")
    .select("statut")
    .eq("mission_id", missionId)
    .maybeSingle();
  if (!paiement || paiement.statut !== "en_attente") {
    return { success: false, error: "Cette mission n'attend pas de paiement." };
  }

  // Le devis (s'il y en a un — absent sur les missions nées hors
  // parcours candidature, ex. panier, voir DevisPayload dans
  // lib/messages.ts) doit être la version ACTIVE et ACCEPTÉE avant de
  // pouvoir payer : jamais une ancienne version, jamais un devis
  // encore "en_attente"/"ajustement_demande"/"refusee". Revérifié ici,
  // côté serveur, pas seulement en cachant le bouton "Payer" dans
  // DevisCard tant que devis.statut !== "acceptee".
  const { data: dernierDevis } = await admin
    .from("messages")
    .select("metadata")
    .eq("mission_id", missionId)
    .eq("destinataire_id", user.id)
    .eq("type", "devis")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (dernierDevis) {
    const statutDevis = (dernierDevis.metadata as { statut?: string } | null)?.statut ?? "acceptee";
    if (statutDevis !== "acceptee") {
      return { success: false, error: "Le devis actif de cette mission n'a pas encore été accepté." };
    }
  }

  const montant = await montantAPayer(admin, missionId);
  if (montant <= 0) {
    return { success: false, error: "Aucun professionnel n'a encore accepté cette mission." };
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch {
    return { success: false, error: "Le paiement n'est pas encore configuré sur cette instance (clé Stripe manquante)." };
  }

  // Carte uniquement (pas automatic_payment_methods) : ce paiement
  // s'affiche dans une carte de devis compacte au sein du fil de
  // messages, pas sur une page dédiée comme /panier — l'accordéon de
  // tous les moyens de paiement Stripe y serait à l'étroit.
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(montant * 100),
    currency: "eur",
    metadata: { mission_id: missionId, recruteur_id: user.id },
    payment_method_types: ["card"],
  });
  if (!intent.client_secret) {
    return { success: false, error: "Impossible d'initialiser le paiement." };
  }

  return { success: true, data: { clientSecret: intent.client_secret, montant } };
}

export type RepartitionPaiement = RepartitionLigne;

/**
 * Répartition prestation / commission / total / net d'une mission,
 * pour l'afficher au client avant paiement (carte devis) — jamais une
 * fonctionnalité de tarification, seulement de la transparence sur un
 * montant déjà dû aujourd'hui. Le total est calculé exactement comme
 * `creerIntentionPaiementMission` (montantAPayer, lignes réellement
 * acceptées), pour ne jamais désynchroniser l'affichage du montant
 * réellement facturé ; la répartition elle-même vient de
 * repartitionLigne (lib/facturation.ts), SEULE source de calcul —
 * jamais un second moteur financier ici. Le taux vient de
 * `paiements.taux_commission`, figé à la création de la mission
 * (jamais recalculé après coup).
 */
export async function obtenirRepartitionPaiement(missionId: string): Promise<ActionResult<RepartitionPaiement>> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { data: mission } = await supabaseServer
    .from("missions")
    .select("id, recruteur_id")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission || mission.recruteur_id !== user.id) {
    return { success: false, error: "Mission introuvable." };
  }

  const admin = createAdminClient();
  const [{ data: paiement }, total] = await Promise.all([
    admin.from("paiements").select("taux_commission").eq("mission_id", missionId).maybeSingle(),
    montantAPayer(admin, missionId),
  ]);
  if (!paiement) {
    return { success: false, error: "Aucun paiement associé à cette mission." };
  }

  const repartition = repartitionLigne({ tarif_applique: total, tarif_final: null }, paiement.taux_commission);

  return { success: true, data: repartition };
}

/**
 * Cœur de la confirmation, partagé entre confirmerPaiementMission
 * (déclenché par le navigateur du recruteur) et le webhook Stripe
 * (filet de sécurité si le navigateur ne revient jamais) — n'écrit
 * jamais en base sans avoir revérifié le PaymentIntent auprès de
 * Stripe, jamais sur la seule foi de l'appelant. Idempotent via le
 * garde `statut !== "en_attente"` : un second appel (double clic,
 * webhook arrivant après le client, ou l'inverse) trouve le paiement
 * déjà `sequestre` et sort proprement sans rien recréer.
 */
export async function confirmerPaiementMissionAvecIntent(
  missionId: string,
  paymentIntentId: string,
  expediteurId: string,
): Promise<ActionResult> {
  const admin = createAdminClient();

  const { data: mission } = await admin
    .from("missions")
    .select("id, lieu, date_mission, candidature_id")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission) {
    return { success: false, error: "Mission introuvable." };
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch {
    return { success: false, error: "Le paiement n'est pas configuré." };
  }

  const { data: paiement } = await admin
    .from("paiements")
    .select("statut")
    .eq("mission_id", missionId)
    .maybeSingle();
  if (!paiement || paiement.statut !== "en_attente") {
    // Déjà traité (par le client ou par un appel webhook précédent) —
    // pas une erreur, juste rien à refaire.
    return { success: true };
  }

  const montant = await montantAPayer(admin, missionId);

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== "succeeded") {
    return { success: false, error: "Le paiement n'a pas été confirmé." };
  }
  if (intent.amount !== Math.round(montant * 100)) {
    return { success: false, error: "Le montant payé ne correspond pas au devis." };
  }

  const { error } = await admin.rpc("confirmer_paiement_mission", {
    p_mission_id: missionId,
    p_stripe_payment_intent_id: paymentIntentId,
    p_montant: montant,
  });
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible de confirmer le paiement pour le moment.") };
  }

  // Seule étape qui fait réellement passer une candidature à
  // "acceptee" — jamais "Retenir" (voir retenirCandidature,
  // actions/offres.ts, qui écrit "en_discussion"). Garde explicite sur
  // "en_discussion" : idempotent (un second appel, webhook + retour
  // navigateur, ne fait rien de plus), et ne touche jamais une
  // candidature déjà "refusee"/"acceptee" ni les missions nées hors
  // parcours candidature (candidature_id null, ex. panier).
  if (mission.candidature_id) {
    await admin
      .from("candidatures")
      .update({ statut: "acceptee" })
      .eq("id", mission.candidature_id)
      .eq("statut", "en_discussion");
  }

  // Seuls les professionnels réellement acceptés (donc réellement
  // payés) sont notifiés/messagés ici — une ligne encore 'en_attente'
  // au moment du paiement vient d'être refusée automatiquement par le
  // RPC ci-dessus (voir migration 0040) : la prévenir d'un "paiement
  // sécurisé" serait faux, elle n'a jamais été engagée sur cette
  // mission.
  const { data: lignes } = await admin
    .from("mission_lignes")
    .select("prestataire_id")
    .eq("mission_id", missionId)
    .eq("statut_acceptation", "acceptee");
  const prestataireIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
  const { data: profils } =
    prestataireIds.length > 0
      ? await admin.from("prestataires_profils").select("user_id").in("id", prestataireIds)
      : { data: [] as { user_id: string }[] };

  await Promise.all(
    (profils ?? []).map((p) =>
      Promise.all([
        creerNotification({
          userId: p.user_id,
          type: "mission_acceptee",
          titre: "Paiement sécurisé",
          contenu: `${mission.lieu} — ${mission.date_mission}`,
          lien: `/missions/${missionId}`,
          missionId,
        }),
        creerMessageSysteme({
          missionId,
          expediteurId,
          destinataireId: p.user_id,
          contenu: "💳 Paiement sécurisé. Mission confirmée.",
        }),
      ]),
    ),
  );

  revalidatePath(`/missions/${missionId}`);
  return { success: true };
}

/**
 * Point d'entrée appelé par le navigateur du recruteur juste après le
 * retour de Stripe Elements — vérifie la session, délègue tout le
 * reste à confirmerPaiementMissionAvecIntent (partagée avec le webhook).
 */
export async function confirmerPaiementMission(missionId: string, paymentIntentId: string): Promise<ActionResult> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const { data: mission } = await supabaseServer
    .from("missions")
    .select("id, recruteur_id")
    .eq("id", missionId)
    .maybeSingle();
  if (!mission || mission.recruteur_id !== user.id) {
    return { success: false, error: "Mission introuvable." };
  }

  return confirmerPaiementMissionAvecIntent(missionId, paymentIntentId, user.id);
}
