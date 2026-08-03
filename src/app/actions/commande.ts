"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, TAUX_COMMISSION_DEFAUT } from "@/lib/stripe/server";
import { montantLigne, type Panier } from "@/lib/panier";
import type { MetierType } from "@/lib/supabase/database.types";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string };

type LigneVerifiee = {
  prestataire_id: string;
  metier: MetierType;
  heure_debut: string;
  heure_fin: string;
  tarif_applique: number;
};

type RevalidationResult =
  | { error: string }
  | { lignesVerifiees: LigneVerifiee[]; montantTotal: number };

/**
 * Recalcule le panier à partir des vraies données en base (jamais les
 * valeurs envoyées par le client) : un recruteur ne doit pas pouvoir
 * modifier un tarif ou réserver un prestataire non validé simplement
 * en trafiquant l'appel réseau.
 */
async function revaliderPanier(panier: Panier): Promise<RevalidationResult> {
  if (panier.lignes.length === 0) {
    return { error: "Le panier est vide." };
  }
  if (!panier.lieu.trim() || !panier.dateMission) {
    return { error: "Lieu et date de la mission requis." };
  }

  const admin = createAdminClient();
  const ids = panier.lignes.map((l) => l.prestataireId);
  const { data: prestataires, error } = await admin
    .from("prestataires_publics")
    .select("id, metier, tarif_montant, tarif_type")
    .in("id", ids);

  if (error || !prestataires) {
    return { error: "Impossible de vérifier les prestataires du panier." };
  }

  const parId = new Map(prestataires.map((p) => [p.id, p]));
  const lignesVerifiees: LigneVerifiee[] = [];

  for (const ligne of panier.lignes) {
    const reel = parId.get(ligne.prestataireId);
    if (!reel) {
      return { error: `${ligne.prenom} n'est plus disponible à la réservation.` };
    }
    lignesVerifiees.push({
      prestataire_id: reel.id,
      metier: reel.metier,
      heure_debut: ligne.heureDebut,
      heure_fin: ligne.heureFin,
      tarif_applique: montantLigne({
        ...ligne,
        tarifMontant: reel.tarif_montant,
        tarifType: reel.tarif_type,
      }),
    });
  }

  const montantTotal =
    Math.round(lignesVerifiees.reduce((sum, l) => sum + l.tarif_applique, 0) * 100) / 100;

  return { lignesVerifiees, montantTotal };
}

export async function creerIntentionPaiement(
  panier: Panier,
): Promise<ActionResult<{ clientSecret: string; montant: number }>> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté pour réserver." };
  }

  const revalidation = await revaliderPanier(panier);
  if ("error" in revalidation) {
    return { success: false, error: revalidation.error };
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch {
    return {
      success: false,
      error:
        "Le paiement n'est pas encore configuré sur cette instance (clé Stripe manquante).",
    };
  }

  const montantCentimes = Math.round(revalidation.montantTotal * 100);

  const intent = await stripe.paymentIntents.create({
    amount: montantCentimes,
    currency: "eur",
    metadata: {
      recruteur_id: user.id,
      lieu: panier.lieu,
      date_mission: panier.dateMission,
    },
    automatic_payment_methods: { enabled: true },
  });

  if (!intent.client_secret) {
    return { success: false, error: "Impossible d'initialiser le paiement." };
  }

  return {
    success: true,
    data: { clientSecret: intent.client_secret, montant: revalidation.montantTotal },
  };
}

export async function finaliserCommande(
  paymentIntentId: string,
  panier: Panier,
): Promise<ActionResult<{ missionId: string }>> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return { success: false, error: "Vous devez être connecté pour réserver." };
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch {
    return { success: false, error: "Le paiement n'est pas configuré." };
  }

  const revalidation = await revaliderPanier(panier);
  if ("error" in revalidation) {
    return { success: false, error: revalidation.error };
  }

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const montantAttenduCentimes = Math.round(revalidation.montantTotal * 100);

  if (intent.status !== "succeeded") {
    return { success: false, error: "Le paiement n'a pas été confirmé." };
  }
  if (intent.amount !== montantAttenduCentimes) {
    return { success: false, error: "Le montant payé ne correspond pas au panier." };
  }

  const montantCommission =
    Math.round(revalidation.montantTotal * (TAUX_COMMISSION_DEFAUT / 100) * 100) / 100;

  const admin = createAdminClient();
  const { data: missionId, error } = await admin.rpc("creer_mission_payee", {
    p_recruteur_id: user.id,
    p_lieu: panier.lieu,
    p_date_mission: panier.dateMission,
    p_lignes: revalidation.lignesVerifiees,
    p_montant_total: revalidation.montantTotal,
    p_taux_commission: TAUX_COMMISSION_DEFAUT,
    p_montant_commission: montantCommission,
    p_stripe_payment_intent_id: paymentIntentId,
  });

  if (error || !missionId) {
    return { success: false, error: error?.message ?? "Échec de la création de la mission." };
  }

  return { success: true, data: { missionId } };
}
