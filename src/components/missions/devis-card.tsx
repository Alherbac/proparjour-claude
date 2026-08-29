"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2, MapPin, CalendarDays, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { creerIntentionPaiementMission, confirmerPaiementMission } from "@/app/actions/paiement-mission";
import type { DevisPayload } from "@/lib/messages";
import type { PaiementStatutType } from "@/lib/supabase/database.types";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return null;
  stripePromise ??= loadStripe(key);
  return stripePromise;
}

function PaiementForm({ missionId, montant }: { missionId: string; montant: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErreur(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (confirmError || !paymentIntent) {
      setErreur(confirmError?.message ?? "Le paiement a échoué.");
      setSubmitting(false);
      return;
    }

    const result = await confirmerPaiementMission(missionId, paymentIntent.id);
    if (!result.success) {
      setErreur(result.error);
      setSubmitting(false);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <PaymentElement />
      {erreur && <p className="text-xs font-medium text-destructive">{erreur}</p>}
      <Button type="submit" size="sm" className="w-full rounded-full" disabled={submitting || !stripe}>
        {submitting && <Loader2 className="size-3.5 animate-spin" />}
        Payer {montant} € (fonds séquestrés jusqu&apos;à la mission)
      </Button>
    </form>
  );
}

/**
 * Carte devis affichée dans le fil de messages (Bloc 9) — pré-remplie
 * depuis l'offre au moment de l'acceptation de la candidature (voir
 * repondreCandidature). Le paiement se fait ici, inline : pas de
 * redirection vers /panier, le montant est déjà fixé par le devis.
 */
export function DevisCard({
  missionId,
  devis,
  estRecruteur,
  paiementStatut,
}: {
  missionId: string;
  devis: DevisPayload;
  estRecruteur: boolean;
  paiementStatut: PaiementStatutType | null;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const stripePromise = getStripePromise();

  async function handlePayer() {
    setChargement(true);
    setErreur(null);
    const result = await creerIntentionPaiementMission(missionId);
    setChargement(false);
    if (!result.success) {
      setErreur(result.error);
      return;
    }
    setClientSecret(result.data.clientSecret);
  }

  const jourLabel = new Date(`${devis.date}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const paiementConfirme = paiementStatut !== null && paiementStatut !== "en_attente";

  return (
    <div className="w-full max-w-[420px] rounded-2xl border border-border bg-background p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Devis</p>
      <p className="mt-1 font-heading text-base font-semibold text-foreground">{devis.prestation}</p>
      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 shrink-0" /> {jourLabel}
        </p>
        <p className="flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" /> {devis.heureDebut} – {devis.heureFin}
        </p>
        <p className="flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" /> {devis.lieu}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">{devis.tarifHoraire} € / heure</span>
        <span className="font-heading text-lg font-semibold text-foreground">{devis.montantTotal} €</span>
      </div>

      {paiementConfirme ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <ShieldCheck className="size-3.5" /> Paiement sécurisé
        </p>
      ) : estRecruteur ? (
        clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaiementForm missionId={missionId} montant={devis.montantTotal} />
          </Elements>
        ) : (
          <div className="mt-3">
            {erreur && <p className="mb-2 text-xs font-medium text-destructive">{erreur}</p>}
            {!stripePromise ? (
              <p className="text-xs font-medium text-destructive">Le paiement n&apos;est pas encore configuré sur cette instance.</p>
            ) : (
              <Button size="sm" className="w-full rounded-full" onClick={handlePayer} disabled={chargement}>
                {chargement && <Loader2 className="size-3.5 animate-spin" />}
                Payer maintenant
              </Button>
            )}
          </div>
        )
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">En attente du paiement du client.</p>
      )}
    </div>
  );
}
