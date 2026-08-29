"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/server";
import { getTauxCommission } from "@/lib/commission";
import { montantMission } from "@/lib/duree";
import type { MetierId } from "@/config/metiers";
import type { MetierType, TarifType } from "@/lib/supabase/database.types";
import { creerNotification } from "@/lib/notifications";
import { creerMessageSysteme } from "@/lib/messages";
import { verifierLimiteDebit } from "@/lib/rate-limit";
import { traduireErreurDb } from "@/lib/erreurs-db";
import { rattacherMissionsASerieAvecAdmin } from "@/app/actions/series";

type ActionResult<T = undefined> =
  | ({ success: true } & (T extends undefined ? object : { data: T }))
  | { success: false; error: string; requiresAuth?: boolean };

/**
 * Réservation directe et payée immédiatement (chemin historique
 * "panier"), aujourd'hui utilisée par "Refaire une mission" et
 * "Créer une série récurrente" — deux parcours qui reprennent une
 * équipe déjà connue et n'ont pas à repasser par le consentement
 * individuel du panier → "Proposer la mission" (voir
 * paiement-direct.tsx). Anciennement défini dans lib/panier.ts sous le
 * nom LignePanier ; déplacé et renommé ici quand le panier a été
 * réduit à une simple liste de personnes (aucun détail de mission),
 * ce type restant lui pleinement chargé (date/horaires/lieu) pour ces
 * deux parcours à paiement immédiat.
 */
export type LigneReservation = {
  prestataireId: string;
  prenom: string;
  metier: MetierId;
  tarifMontant: number;
  tarifType: TarifType;
  heureDebut: string | null;
  heureFin: string | null;
  photoUrl: string | null;
  date: string | null;
  adresse: string;
  description: string;
  selectionnee: boolean;
};

/** null tant que le tarif horaire ne peut pas encore être calculé — jamais un 0 € qui laisserait croire à une gratuité. */
function montantLigne(ligne: LigneReservation): number | null {
  if (ligne.tarifType === "horaire") {
    if (!ligne.heureDebut || !ligne.heureFin) return null;
    return montantMission(ligne.heureDebut, ligne.heureFin, ligne.tarifMontant);
  }
  return ligne.tarifMontant;
}

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
 * c'est plus bas, voir refaire-mission-form.tsx / creer-serie-form.tsx)
 * — on se contente ici de vérifier qu'il est strictement positif.
 */
async function revaliderLignes(lignes: LigneReservation[]): Promise<RevalidationResult> {
  if (lignes.length === 0) {
    return { error: "Sélectionnez au moins un prestataire à envoyer." };
  }
  for (const ligne of lignes) {
    if (!ligne.date || !ligne.adresse.trim()) {
      return { error: `Date et adresse requises pour ${ligne.prenom}.` };
    }
    if (!ligne.heureDebut || !ligne.heureFin) {
      return { error: `Horaires requis pour ${ligne.prenom}.` };
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
    // date/heures déjà validées non nulles dans la boucle précédente —
    // ces gardes ne servent qu'à faire remonter le typage à TypeScript.
    const { date, heureDebut, heureFin } = ligne;
    const montant = montantLigne(ligne);
    if (!date || !heureDebut || !heureFin || montant === null) {
      return { error: `Date et horaires requis pour ${ligne.prenom}.` };
    }
    lignesVerifiees.push({
      prestataire_id: reel.id,
      metier: reel.metier,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      tarif_applique: montant,
      date,
      adresse: ligne.adresse,
      description: ligne.description,
    });
  }

  const montantTotal =
    Math.round(lignesVerifiees.reduce((sum, l) => sum + l.tarif_applique, 0) * 100) / 100;

  return { lignesVerifiees, montantTotal };
}

export async function creerIntentionPaiement(
  lignes: LigneReservation[],
  serieId?: string,
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

  if (!(await verifierLimiteDebit(`paiement:${user.id}`, 10, 10 * 60))) {
    return { success: false, error: "Trop de tentatives de paiement. Réessayez dans quelques minutes." };
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

  // Snapshot des lignes déjà revalidées, pour que le webhook Stripe
  // (api/webhooks/stripe) puisse finaliser la commande même si le
  // navigateur du recruteur ne revient jamais (onglet fermé juste
  // après un paiement pourtant réussi) — sans ça, le webhook reçoit
  // payment_intent.succeeded mais n'a aucun moyen de savoir quelles
  // missions créer, ce panier ne vivant que dans le localStorage
  // client. Best-effort : une écriture échouée ici ne bloque pas le
  // paiement, elle prive seulement le webhook de son filet de
  // sécurité pour cette commande (finaliserCommande, appelé par le
  // client juste après, reste le chemin principal).
  const admin = createAdminClient();
  await admin.from("commandes_en_attente").insert({
    payment_intent_id: intent.id,
    recruteur_id: user.id,
    lignes,
    serie_id: serieId ?? null,
  });

  return {
    success: true,
    data: { clientSecret: intent.client_secret, montant: revalidation.montantTotal },
  };
}

/**
 * Cœur de la finalisation, partagé entre finaliserCommande (déclenché
 * par le navigateur juste après le paiement) et le webhook Stripe
 * (filet de sécurité si le navigateur ne revient jamais) — même
 * logique, même garde d'idempotence, une seule implémentation.
 * `lignes` doit déjà être le panier réel (venant du client ou du
 * snapshot commandes_en_attente écrit par creerIntentionPaiement) ;
 * cette fonction revalide quand même chaque ligne contre la base
 * avant de créer quoi que ce soit.
 */
export async function finaliserCommandeAvecLignes(
  paymentIntentId: string,
  lignes: LigneReservation[],
  recruteurId: string,
): Promise<ActionResult<{ missionIds: string[] }>> {
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

  const admin = createAdminClient();

  // Idempotence : un double clic, un retry réseau, un rechargement de
  // page juste après la confirmation Stripe, OU le webhook arrivant
  // après (ou en même temps) que finaliserCommande a déjà tourné,
  // peuvent tous déclencher un second appel avec le même
  // paymentIntentId (déjà "succeeded" côté Stripe, donc les deux
  // vérifications ci-dessus passent à chaque fois). Sans ce
  // court-circuit, chaque appel insère une nouvelle mission — un seul
  // paiement réel créerait deux missions et deux séquestres.
  const { data: missionsExistantes } = await admin
    .from("paiements")
    .select("mission_id")
    .eq("stripe_payment_intent_id", paymentIntentId);
  if (missionsExistantes && missionsExistantes.length > 0) {
    return { success: true, data: { missionIds: missionsExistantes.map((p) => p.mission_id) } };
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

  const missionIds: string[] = [];
  const tauxCommission = await getTauxCommission();

  for (const groupe of groupes.values()) {
    const montantGroupe =
      Math.round(groupe.lignes.reduce((sum, l) => sum + l.tarif_applique, 0) * 100) / 100;
    const montantCommissionGroupe =
      Math.round(montantGroupe * (tauxCommission / 100) * 100) / 100;

    const { data: missionId, error } = await admin.rpc("creer_mission_payee", {
      p_recruteur_id: recruteurId,
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
      p_taux_commission: tauxCommission,
      p_montant_commission: montantCommissionGroupe,
      p_stripe_payment_intent_id: paymentIntentId,
      p_description: groupe.description || null,
    });

    if (error || !missionId) {
      return { success: false, error: error ? traduireErreurDb(error, "Échec de la création de la mission.") : "Échec de la création de la mission." };
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
        expediteurId: recruteurId,
        destinataireId: profil.user_id,
        contenu: `📅 Nouvelle mission proposée : ${groupe.adresse}, le ${groupe.date}.`,
      });
    }
  }

  // Rattachement fiable à la série (migration 0041) : rejoué ici,
  // quel que soit le chemin qui a fini par traiter ce paiement
  // (navigateur ou webhook), plutôt que de dépendre uniquement de
  // l'appel côté navigateur (rattacherMissionsASerie, déclenché par
  // CheckoutForm) — qui ne joue jamais si l'onglet se ferme entre la
  // confirmation Stripe et cet appel. Best-effort, comme le reste du
  // filet de sécurité de cette fonction : un snapshot absent (paiement
  // hors série) ou une erreur ici ne doit jamais faire échouer la
  // commande elle-même, déjà payée et créée à ce stade.
  const { data: commandeSnapshot } = await admin
    .from("commandes_en_attente")
    .select("serie_id")
    .eq("payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (commandeSnapshot?.serie_id) {
    await rattacherMissionsASerieAvecAdmin(admin, commandeSnapshot.serie_id, missionIds, recruteurId);
  }

  return { success: true, data: { missionIds } };
}

/**
 * Point d'entrée appelé par le navigateur du recruteur juste après le
 * retour de Stripe Elements — vérifie la session, délègue tout le
 * reste à finaliserCommandeAvecLignes (partagée avec le webhook).
 */
export async function finaliserCommande(
  paymentIntentId: string,
  lignes: LigneReservation[],
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

  return finaliserCommandeAvecLignes(paymentIntentId, lignes, user.id);
}
