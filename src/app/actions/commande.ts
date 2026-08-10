"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, TAUX_COMMISSION_DEFAUT } from "@/lib/stripe/server";
import { montantLigne, type LignePanier } from "@/lib/panier";
import type { MetierType } from "@/lib/supabase/database.types";
import { creerNotification } from "@/lib/notifications";
import { creerMessageSysteme } from "@/lib/messages";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string; requiresAuth?: boolean };

type LigneVerifiee = {
  prestataire_id: string;
  metier: MetierType;
  heure_debut: string;
  heure_fin: string;
  tarif_applique: number;
  date: string;
  adresse: string;
  description: string;
};

type RevalidationResult =
  | { error: string }
  | { lignesVerifiees: LigneVerifiee[]; montantTotal: number };

/**
 * Recalcule les lignes à envoyer à partir des vraies données en base
 * pour tout ce qu'un recruteur ne doit pas pouvoir trafiquer (métier,
 * existence du prestataire). Le tarif horaire, lui, est volontairement
 * négociable : le recruteur peut proposer un montant différent du
 * tarif de référence du prestataire (avertissement côté client si
 * c'est plus bas, voir ajouter-mission-popover.tsx / booking-card.tsx)
 * — on se contente ici de vérifier qu'il est strictement positif.
 */
async function revaliderLignes(lignes: LignePanier[]): Promise<RevalidationResult> {
  if (lignes.length === 0) {
    return { error: "Sélectionnez au moins un prestataire à envoyer." };
  }
  for (const ligne of lignes) {
    if (!ligne.date || !ligne.adresse.trim()) {
      return { error: `Date et adresse requises pour ${ligne.prenom}.` };
    }
    if (!ligne.tarifMontant || ligne.tarifMontant <= 0) {
      return { error: `Indiquez un tarif horaire supérieur à 0 pour ${ligne.prenom}.` };
    }
  }

  const admin = createAdminClient();
  const ids = lignes.map((l) => l.prestataireId);
  const { data: prestataires, error } = await admin
    .from("prestataires_publics")
    .select("id, metier")
    .in("id", ids);

  if (error || !prestataires) {
    return { error: "Impossible de vérifier les prestataires du panier." };
  }

  const parId = new Map(prestataires.map((p) => [p.id, p]));
  const lignesVerifiees: LigneVerifiee[] = [];

  for (const ligne of lignes) {
    const reel = parId.get(ligne.prestataireId);
    if (!reel) {
      return { error: `${ligne.prenom} n'est plus disponible à la réservation.` };
    }
    lignesVerifiees.push({
      prestataire_id: reel.id,
      metier: reel.metier,
      heure_debut: ligne.heureDebut,
      heure_fin: ligne.heureFin,
      tarif_applique: montantLigne(ligne),
      date: ligne.date,
      adresse: ligne.adresse,
      description: ligne.description,
    });
  }

  const montantTotal =
    Math.round(lignesVerifiees.reduce((sum, l) => sum + l.tarif_applique, 0) * 100) / 100;

  return { lignesVerifiees, montantTotal };
}

export async function creerIntentionPaiement(
  lignes: LignePanier[],
): Promise<ActionResult<{ clientSecret: string; montant: number }>> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return {
      success: false,
      error: "Vous devez être connecté pour envoyer cette offre.",
      requiresAuth: true,
    };
  }

  const revalidation = await revaliderLignes(lignes);
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
      nombre_prestataires: String(revalidation.lignesVerifiees.length),
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
  lignes: LignePanier[],
): Promise<ActionResult<{ missionIds: string[] }>> {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  if (!user) {
    return {
      success: false,
      error: "Vous devez être connecté pour envoyer cette offre.",
      requiresAuth: true,
    };
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch {
    return { success: false, error: "Le paiement n'est pas configuré." };
  }

  const revalidation = await revaliderLignes(lignes);
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

  // Un panier multi-prestataires peut couvrir plusieurs événements
  // distincts (adresses/dates différentes) — on regroupe les lignes
  // par événement réel et on crée une mission par groupe, toutes
  // rattachées au même paiement Stripe déjà confirmé ci-dessus.
  const groupes = new Map<
    string,
    { date: string; adresse: string; description: string; lignes: LigneVerifiee[] }
  >();
  for (const ligne of revalidation.lignesVerifiees) {
    const cle = `${ligne.date}|${ligne.adresse}|${ligne.description}`;
    let groupe = groupes.get(cle);
    if (!groupe) {
      groupe = { date: ligne.date, adresse: ligne.adresse, description: ligne.description, lignes: [] };
      groupes.set(cle, groupe);
    }
    groupe.lignes.push(ligne);
  }

  const admin = createAdminClient();
  const missionIds: string[] = [];

  for (const groupe of groupes.values()) {
    const montantGroupe =
      Math.round(groupe.lignes.reduce((sum, l) => sum + l.tarif_applique, 0) * 100) / 100;
    const montantCommissionGroupe =
      Math.round(montantGroupe * (TAUX_COMMISSION_DEFAUT / 100) * 100) / 100;

    const { data: missionId, error } = await admin.rpc("creer_mission_payee", {
      p_recruteur_id: user.id,
      p_lieu: groupe.adresse,
      p_date_mission: groupe.date,
      p_lignes: groupe.lignes.map(({ prestataire_id, metier, heure_debut, heure_fin, tarif_applique }) => ({
        prestataire_id,
        metier,
        heure_debut,
        heure_fin,
        tarif_applique,
      })),
      p_montant_total: montantGroupe,
      p_taux_commission: TAUX_COMMISSION_DEFAUT,
      p_montant_commission: montantCommissionGroupe,
      p_stripe_payment_intent_id: paymentIntentId,
      p_description: groupe.description || null,
    });

    if (error || !missionId) {
      return { success: false, error: error?.message ?? "Échec de la création de la mission." };
    }
    missionIds.push(missionId);

    const prestataireIds = [...new Set(groupe.lignes.map((l) => l.prestataire_id))];
    const { data: profils } = await admin
      .from("prestataires_profils")
      .select("user_id")
      .in("id", prestataireIds);
    for (const profil of profils ?? []) {
      await creerNotification({
        userId: profil.user_id,
        type: "mission_proposee",
        titre: "Nouvelle mission proposée",
        contenu: `${groupe.adresse} — ${groupe.date}`,
        lien: `/missions/${missionId}`,
        missionId,
      });
      await creerMessageSysteme({
        missionId,
        expediteurId: user.id,
        destinataireId: profil.user_id,
        contenu: `📅 Nouvelle mission proposée : ${groupe.adresse}, le ${groupe.date}.`,
      });
    }
  }

  return { success: true, data: { missionIds } };
}
