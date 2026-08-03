"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { finaliserCommande } from "@/app/actions/commande";
import { viderPanier, type Panier } from "@/lib/panier";

export function CheckoutForm({ panier, montant }: { panier: Panier; montant: number }) {
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

    const result = await finaliserCommande(paymentIntent.id, panier);
    if (!result.success) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    viderPanier();
    router.push(`/tableau-de-bord?mission=${result.data.missionId}`);
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
