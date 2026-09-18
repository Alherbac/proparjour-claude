"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/server";
import { verifierLimiteDebit } from "@/lib/rate-limit";
import { traduireErreurDb } from "@/lib/erreurs-db";
import { confirmerServiceFait } from "@/app/actions/missions";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

/**
 * Complément de paiement pour heures supplémentaires (validation
 * produit 2026-09-18) — RÉUTILISE exactement le pipeline Stripe déjà
 * en place (PaymentIntent carte, même schéma que
 * creerIntentionPaiementMission, actions/paiement-mission.ts) pour un
 * SEUL complément par mission, jamais un deuxième moteur financier,
 * jamais Stripe Connect, jamais de transfert automatique. Le montant
 * initial séquestré n'est jamais touché : ce PaymentIntent ne porte
 * QUE la différence calculée côté serveur
 * (`paiements.complement_montant_du`, posé par confirmerHorairesFinMission).
 */
export async function creerIntentionPaiementComplement(
  missionId: string,
): Promise<ActionResult<{ clientSecret: string; montant: number }>> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  if (!(await verifierLimiteDebit(`paiement-complement:${user.id}`, 10, 10 * 60))) {
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
    .select("complement_montant_du, complement_paye")
    .eq("mission_id", missionId)
    .maybeSingle();
  if (!paiement || paiement.complement_paye || !paiement.complement_montant_du) {
    return { success: false, error: "Aucun complément de paiement en attente pour cette mission." };
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch {
    return { success: false, error: "Le paiement n'est pas encore configuré sur cette instance (clé Stripe manquante)." };
  }

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(paiement.complement_montant_du * 100),
    currency: "eur",
    metadata: { mission_id: missionId, recruteur_id: user.id, type: "complement" },
    payment_method_types: ["card"],
  });
  if (!intent.client_secret) {
    return { success: false, error: "Impossible d'initialiser le paiement." };
  }

  return { success: true, data: { clientSecret: intent.client_secret, montant: paiement.complement_montant_du } };
}

/**
 * Cœur de la confirmation — jamais écrit en base sans avoir revérifié
 * le PaymentIntent auprès de Stripe, même principe que
 * confirmerPaiementMissionAvecIntent. Idempotent via le garde
 * `complement_paye` : un second appel (double clic, retour navigateur
 * répété) trouve déjà le complément réglé et sort proprement.
 * Une fois réglé, retente confirmerServiceFait (actions/missions.ts) :
 * si les horaires étaient déjà confirmés et qu'aucune autre ligne ne
 * bloque, le service fait est validé et le total (initial + complément)
 * libéré dans la même action, sans bouton séparé.
 */
export async function confirmerPaiementComplementAvecIntent(missionId: string, paymentIntentId: string): Promise<ActionResult> {
  const admin = createAdminClient();

  const { data: paiement } = await admin
    .from("paiements")
    .select("complement_montant_du, complement_paye")
    .eq("mission_id", missionId)
    .maybeSingle();
  if (!paiement) {
    return { success: false, error: "Mission introuvable." };
  }
  if (paiement.complement_paye) {
    // Déjà traité — pas une erreur, rien à refaire.
    return { success: true };
  }
  if (!paiement.complement_montant_du) {
    return { success: false, error: "Aucun complément attendu pour cette mission." };
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch {
    return { success: false, error: "Le paiement n'est pas configuré." };
  }

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (intent.status !== "succeeded") {
    return { success: false, error: "Le paiement n'a pas été confirmé." };
  }
  if (intent.amount !== Math.round(paiement.complement_montant_du * 100)) {
    return { success: false, error: "Le montant payé ne correspond pas au complément attendu." };
  }

  const { error } = await admin
    .from("paiements")
    .update({ complement_paye: true, complement_stripe_payment_intent_id: paymentIntentId })
    .eq("mission_id", missionId);
  if (error) {
    return { success: false, error: traduireErreurDb(error, "Impossible de confirmer le complément pour le moment.") };
  }

  // Best-effort : si les horaires étaient déjà confirmés et plus
  // aucune ligne ne bloque, ceci libère le total complet dans la même
  // action. Sinon (autre ligne encore en attente sur une mission à
  // plusieurs prestataires), la garde existante refuse encore — sans
  // conséquence sur le complément qui vient, lui, d'être réglé.
  await confirmerServiceFait(missionId);

  revalidatePath(`/missions/${missionId}`);
  return { success: true };
}

/** Point d'entrée navigateur — vérifie la session, délègue à confirmerPaiementComplementAvecIntent. */
export async function confirmerPaiementComplement(missionId: string, paymentIntentId: string): Promise<ActionResult> {
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

  return confirmerPaiementComplementAvecIntent(missionId, paymentIntentId);
}
