"use client";

import { useState } from "react";
import Link from "next/link";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Trash2, ShoppingCart, MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/onboarding/form-field";
import { METIERS } from "@/config/metiers";
import { usePanier } from "@/hooks/use-panier";
import { montantLigne, retirerLigne, mettreAJourContexte, totalPanier } from "@/lib/panier";
import { creerIntentionPaiement } from "@/app/actions/commande";
import { CheckoutForm } from "@/components/panier/checkout-form";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  stripePromise ??= loadStripe(key);
  return stripePromise;
}

export function PanierContent() {
  const panier = usePanier();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [montant, setMontant] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const total = totalPanier(panier);
  const stripePromise = getStripePromise();

  async function handleProcederPaiement() {
    setErreur(null);
    setChargement(true);
    const result = await creerIntentionPaiement(panier);
    setChargement(false);
    if (!result.success) {
      setErreur(result.error);
      return;
    }
    setClientSecret(result.data.clientSecret);
    setMontant(result.data.montant);
  }

  if (panier.lignes.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-4 py-20 text-center">
        <ShoppingCart className="size-10 text-muted-foreground" />
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Votre panier est vide
        </h1>
        <p className="text-muted-foreground">
          Parcourez les profils et ajoutez des prestataires pour composer votre mission.
        </p>
        <Button render={<Link href="/prestataires" />} className="mt-2 rounded-full">
          Trouver un prestataire
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8 lg:py-14">
      <h1 className="font-heading text-3xl font-semibold text-foreground">Mon panier</h1>

      <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-secondary/30 p-4 sm:grid-cols-2">
        <FormField label="Lieu de la mission" htmlFor="panierLieu">
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="panierLieu"
              className="pl-8"
              value={panier.lieu}
              onChange={(e) => mettreAJourContexte({ lieu: e.target.value, dateMission: panier.dateMission })}
            />
          </div>
        </FormField>
        <FormField label="Date de la mission" htmlFor="panierDate">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="panierDate"
              type="date"
              className="pl-8"
              value={panier.dateMission}
              onChange={(e) => mettreAJourContexte({ lieu: panier.lieu, dateMission: e.target.value })}
            />
          </div>
        </FormField>
      </div>

      <ul className="mt-6 space-y-3">
        {panier.lignes.map((ligne, index) => {
          const metier = METIERS.find((m) => m.id === ligne.metier);
          return (
            <li
              key={`${ligne.prestataireId}-${index}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4"
            >
              <div>
                <p className="font-medium text-foreground">{ligne.prenom}</p>
                <p className="text-sm text-muted-foreground">
                  {metier?.label} · {ligne.heureDebut} – {ligne.heureFin}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">{montantLigne(ligne)} €</span>
                <button
                  type="button"
                  aria-label="Retirer du panier"
                  onClick={() => retirerLigne(index)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
        <span className="text-lg font-semibold text-foreground">Total</span>
        <span className="font-heading text-2xl font-semibold text-foreground">{total} €</span>
      </div>

      {!clientSecret ? (
        <div className="mt-6">
          {erreur && <p className="mb-3 text-sm font-medium text-destructive">{erreur}</p>}
          <Button
            className="w-full rounded-full"
            onClick={handleProcederPaiement}
            disabled={chargement}
          >
            {chargement ? "Préparation du paiement..." : "Procéder au paiement"}
          </Button>
        </div>
      ) : stripePromise ? (
        <div className="mt-6 rounded-2xl border border-border bg-background p-6">
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm panier={panier} montant={montant ?? total} />
          </Elements>
        </div>
      ) : (
        <p className="mt-6 text-sm font-medium text-destructive">
          Le paiement n&apos;est pas encore configuré sur cette instance.
        </p>
      )}
    </div>
  );
}
