"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { DashButton } from "@/app/client/_components/button";
import { finaliserCommande, type LigneReservation } from "@/app/actions/commande";
import { lireSerieEnAttente, oublierSerieEnAttente } from "@/lib/serie-en-attente";
import { rattacherMissionsASerie } from "@/app/actions/series";

/**
 * Formulaire Stripe Elements final, réutilisé par les deux parcours à
 * paiement immédiat ("Refaire une mission", "Créer une série
 * récurrente" — voir paiement-direct.tsx). Le panier, lui, ne paie
 * plus rien directement depuis le lancement de l'écran "Proposer la
 * mission" (le paiement y intervient seulement après acceptation du
 * professionnel, via la carte de devis existante en messagerie) — ce
 * composant n'a donc plus jamais besoin de retirer des lignes du
 * panier localStorage après paiement.
 */
export function CheckoutForm({
  lignes,
  montant,
}: {
  lignes: LigneReservation[];
  montant: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError || !paymentIntent) {
      setError(confirmError?.message ?? "Le paiement a échoué.");
      setSubmitting(false);
      return;
    }

    const result = await finaliserCommande(paymentIntent.id, lignes);
    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    const serieEnAttente = lireSerieEnAttente();
    if (serieEnAttente) {
      await rattacherMissionsASerie(serieEnAttente, result.data.missionIds);
      oublierSerieEnAttente();
      router.push(`/client/series/${serieEnAttente}`);
      return;
    }

    router.push("/client/missions");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-[13px] font-medium" style={{ color: "#8E2A26" }}>
          {error}
        </p>
      )}
      <DashButton type="submit" variant="plein" className="w-full" disabled={submitting || !stripe}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Payer {montant} € (fonds séquestrés jusqu&apos;à la mission)
      </DashButton>
    </form>
  );
}
