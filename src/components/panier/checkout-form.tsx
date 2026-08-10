"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { finaliserCommande } from "@/app/actions/commande";
import { retirerLignesParIndex, type LignePanier } from "@/lib/panier";

export function CheckoutForm({
  lignes,
  indices,
  montant,
}: {
  lignes: LignePanier[];
  indices: number[];
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

    // Ne retire du panier que les lignes effectivement envoyées — les
    // prestataires laissés décochés restent disponibles pour un envoi
    // ultérieur.
    retirerLignesParIndex(indices);

    const [premierMissionId] = result.data.missionIds;
    router.push(
      result.data.missionIds.length === 1
        ? `/tableau-de-bord?mission=${premierMissionId}`
        : "/tableau-de-bord/missions",
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      <Button type="submit" className="w-full rounded-full" disabled={submitting || !stripe}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Payer {montant} € (fonds séquestrés jusqu&apos;à la mission)
      </Button>
    </form>
  );
}
