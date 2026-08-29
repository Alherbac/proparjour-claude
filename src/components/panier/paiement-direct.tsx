"use client";

import { useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { creerIntentionPaiement, type LigneReservation } from "@/app/actions/commande";
import { CheckoutForm } from "@/components/panier/checkout-form";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  stripePromise ??= loadStripe(key);
  return stripePromise;
}

/**
 * Paiement immédiat hors panier — pour "Refaire une mission"
 * (refaire-mission-form.tsx) et "Créer une série récurrente"
 * (creer-serie-form.tsx). Ces deux parcours reprennent une équipe déjà
 * connue et validée par le client : contrairement au nouveau parcours
 * panier → "Proposer la mission" → acceptation, ils n'ont pas à
 * repasser par le consentement individuel de chaque professionnel
 * avant paiement (déjà acquis via l'historique commun). Décision du
 * <chantier "panier + proposition">, pour ne pas casser ces deux
 * fonctionnalités existantes en les forçant dans le nouveau modèle.
 *
 * Réutilise tel quel le mécanisme de paiement déjà en place pour le
 * panier (creerIntentionPaiement + CheckoutForm, actions/commande.ts,
 * inchangé) — seule différence : `indices` est toujours vide, ce
 * parcours n'écrit jamais dans le panier localStorage.
 */
export function PaiementDirect({ lignes, serieId }: { lignes: LigneReservation[]; serieId?: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [montant, setMontant] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const stripePromise = getStripePromise();

  async function handleProcederPaiement() {
    setErreur(null);
    setChargement(true);
    const result = await creerIntentionPaiement(lignes, serieId);
    setChargement(false);
    if (!result.success) {
      setErreur(result.error);
      return;
    }
    setClientSecret(result.data.clientSecret);
    setMontant(result.data.montant);
  }

  if (clientSecret) {
    if (!stripePromise) {
      return (
        <p className="text-sm font-medium text-destructive">Le paiement n&apos;est pas encore configuré sur cette instance.</p>
      );
    }
    return (
      <div className="rounded-2xl border border-border bg-secondary/30 p-5">
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm lignes={lignes} montant={montant ?? 0} />
        </Elements>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {erreur && <p className="text-sm font-medium text-destructive">{erreur}</p>}
      <Button type="button" className="w-full rounded-full" disabled={chargement} onClick={handleProcederPaiement}>
        {chargement ? "Préparation du paiement..." : "Confirmer et payer"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Paiement sécurisé. Les fonds sont séquestrés et versés après confirmation du service fait.
      </p>
    </div>
  );
}
