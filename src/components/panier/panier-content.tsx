"use client";

import { useState } from "react";
import Link from "next/link";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Trash2, ShoppingCart, MapPin, CalendarDays, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { METIERS } from "@/config/metiers";
import { usePanier } from "@/hooks/use-panier";
import { montantLigne, retirerLigne, basculerSelectionLigne, totalPanier } from "@/lib/panier";
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
  const [demandeAuth, setDemandeAuth] = useState(false);
  const [chargement, setChargement] = useState(false);

  const lignesAvecIndex = panier.lignes.map((ligne, index) => ({ ligne, index }));
  const lignesSelectionnees = lignesAvecIndex.filter(({ ligne }) => ligne.selectionnee);
  const total = totalPanier({ lignes: lignesSelectionnees.map(({ ligne }) => ligne) });
  const stripePromise = getStripePromise();

  async function handleProcederPaiement() {
    setErreur(null);
    setDemandeAuth(false);
    setChargement(true);
    const result = await creerIntentionPaiement(lignesSelectionnees.map(({ ligne }) => ligne));
    setChargement(false);
    if (!result.success) {
      if (result.requiresAuth) {
        setDemandeAuth(true);
      } else {
        setErreur(result.error);
      }
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
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Home className="size-3.5" />
        Retour à l&apos;accueil
      </Link>

      <h1 className="mt-4 font-heading text-3xl font-semibold text-foreground">Mon panier</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Décochez un prestataire pour l&apos;envoyer plus tard plutôt que maintenant.
      </p>

      <ul className="mt-6 space-y-3">
        {lignesAvecIndex.map(({ ligne, index }) => {
          const metier = METIERS.find((m) => m.id === ligne.metier);
          return (
            <li
              key={`${ligne.prestataireId}-${index}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4"
            >
              <Link href={`/prestataires/${ligne.prestataireId}`} className="shrink-0">
                {ligne.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
                  <img
                    src={ligne.photoUrl}
                    alt={ligne.prenom}
                    className="size-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground/70">
                    {ligne.prenom.charAt(0)}
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{ligne.prenom}</p>
                <p className="text-sm text-muted-foreground">
                  {metier?.label} · {ligne.heureDebut} – {ligne.heureFin}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3" />
                  {ligne.date}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <MapPin className="size-3 shrink-0" />
                  <span className="truncate">{ligne.adresse}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-medium text-foreground">{montantLigne(ligne)} €</span>
                <button
                  type="button"
                  aria-label="Retirer du panier"
                  onClick={() => retirerLigne(index)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
                <Checkbox
                  checked={ligne.selectionnee}
                  onCheckedChange={() => basculerSelectionLigne(index)}
                  aria-label={`Inclure ${ligne.prenom} dans l'envoi`}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
        <span className="text-lg font-semibold text-foreground">
          Total ({lignesSelectionnees.length} sélectionné{lignesSelectionnees.length > 1 ? "s" : ""})
        </span>
        <span className="font-heading text-2xl font-semibold text-foreground">{total} €</span>
      </div>

      {!clientSecret ? (
        <div className="mt-6">
          {demandeAuth ? (
            <div className="rounded-2xl border border-border bg-secondary/30 p-5 text-center">
              <p className="mb-4 text-sm text-foreground">
                Encore une étape : connectez-vous ou créez un compte pour envoyer cette
                offre. Votre panier reste enregistré.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button render={<Link href="/connexion?next=/panier" />} className="rounded-full">
                  Se connecter
                </Button>
                <Button
                  render={<Link href="/inscription/recruteur" />}
                  variant="outline"
                  className="rounded-full"
                >
                  Créer un compte
                </Button>
              </div>
            </div>
          ) : (
            <>
              {erreur && <p className="mb-3 text-sm font-medium text-destructive">{erreur}</p>}
              <Button
                className="w-full rounded-full"
                onClick={handleProcederPaiement}
                disabled={chargement || lignesSelectionnees.length === 0}
              >
                {chargement ? "Préparation du paiement..." : "Envoyer l'offre"}
              </Button>
            </>
          )}
        </div>
      ) : stripePromise ? (
        <div className="mt-6 rounded-2xl border border-border bg-background p-6">
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm
              lignes={lignesSelectionnees.map(({ ligne }) => ligne)}
              indices={lignesSelectionnees.map(({ index }) => index)}
              montant={montant ?? total}
            />
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
