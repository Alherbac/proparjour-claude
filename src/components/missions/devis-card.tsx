"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  creerIntentionPaiementMission,
  confirmerPaiementMission,
  obtenirRepartitionPaiement,
  type RepartitionPaiement,
} from "@/app/actions/paiement-mission";
import { accepterDevis, demanderAjustementDevis, declinerDevis } from "@/app/actions/missions";
import { heuresEntre } from "@/lib/duree";
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
      <Button type="submit" size="xl" className="w-full rounded-full" disabled={submitting || !stripe}>
        {submitting && <Loader2 className="size-3.5 animate-spin" />}
        Payer {montant} € (fonds séquestrés jusqu&apos;à la mission)
      </Button>
    </form>
  );
}

function Pastille({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Réponse du client à un devis "en_attente" — accepter (déclenche la
 * possibilité de payer, plus bas dans la même carte une fois
 * rafraîchie) ou demander un ajustement (le prestataire peut alors en
 * renvoyer un dans la même conversation, voir EnvoyerDevisForm).
 */
function ReponseDevisForm({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [ajustementOuvert, setAjustementOuvert] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function accepter() {
    setIsPending(true);
    const result = await accepterDevis(messageId);
    setIsPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Devis accepté — vous pouvez maintenant payer.");
    router.refresh();
  }

  async function envoyerAjustement() {
    setIsPending(true);
    const result = await demanderAjustementDevis(messageId, note);
    setIsPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Demande d'ajustement envoyée.");
    setAjustementOuvert(false);
    setNote("");
    router.refresh();
  }

  async function decliner() {
    setIsPending(true);
    const result = await declinerDevis(messageId);
    setIsPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Devis décliné.");
    router.refresh();
  }

  if (ajustementOuvert) {
    return (
      <div className="mt-4 space-y-2.5">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ce que vous souhaiteriez ajuster (facultatif)"
          maxLength={500}
        />
        <div className="flex flex-wrap gap-2.5">
          <Button size="xl" onClick={envoyerAjustement} disabled={isPending}>
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            Envoyer la demande
          </Button>
          <Button size="xl" variant="outline" onClick={() => setAjustementOuvert(false)} disabled={isPending}>
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button size="xl" className="flex-1" onClick={accepter} disabled={isPending}>
          {isPending && <Loader2 className="size-3.5 animate-spin" />}
          Accepter le devis
        </Button>
        <Button size="xl" variant="outline" className="flex-1" onClick={() => setAjustementOuvert(true)} disabled={isPending}>
          Proposer un ajustement
        </Button>
      </div>
      <button
        type="button"
        onClick={decliner}
        disabled={isPending}
        className="mt-2.5 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
      >
        Décliner ce devis
      </button>
      <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">
        Paiement encadré : le montant est bloqué à l&apos;acceptation et versé après la mission.
      </p>
    </>
  );
}

/** Le prestataire, après une demande d'ajustement, décline plutôt que de renvoyer un nouveau devis (voir declinerDevis, actions/missions.ts). */
function DeclinerAjustementButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function decliner() {
    setIsPending(true);
    const result = await declinerDevis(messageId);
    setIsPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Devis décliné.");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={decliner}
      disabled={isPending}
      className="mt-2 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
    >
      Décliner plutôt que renvoyer un devis
    </button>
  );
}

/**
 * Carte devis affichée dans le fil de messages (Bloc 9) — envoyée par
 * le prestataire (voir envoyerDevis, actions/missions.ts) après
 * échange avec le client. Trois états, portés par `devis.statut` :
 * "en_attente" (le client doit accepter ou demander un ajustement),
 * "ajustement_demande" (le prestataire peut en renvoyer un), et
 * "acceptee" — y compris les devis créés avant ce chantier, où
 * `statut` est absent et traité comme déjà accepté pour ne rien
 * changer à leur comportement — où le paiement, inline, devient
 * possible : pas de redirection vers /panier, le montant est déjà
 * fixé par le devis.
 */
export function DevisCard({
  missionId,
  messageId,
  devis,
  estRecruteur,
  paiementStatut,
  estLeDernier,
}: {
  missionId: string;
  messageId: string;
  devis: DevisPayload;
  estRecruteur: boolean;
  paiementStatut: PaiementStatutType | null;
  /** Seul le devis le plus récent du fil est actionnable (accepter / ajuster / décliner / payer) — une version remplacée reste visible mais purement informative, jamais qu'un bouton caché : le serveur revérifie de toute façon (voir estDevisActif, actions/missions.ts). */
  estLeDernier: boolean;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [repartition, setRepartition] = useState<RepartitionPaiement | null>(null);
  const stripePromise = getStripePromise();

  const statutPourEffet = devis.statut ?? "acceptee";
  const paiementConfirmePourEffet = paiementStatut !== null && paiementStatut !== "en_attente";
  useEffect(() => {
    if (!estRecruteur || statutPourEffet !== "acceptee" || paiementConfirmePourEffet) return;
    let annule = false;
    obtenirRepartitionPaiement(missionId).then((result) => {
      if (!annule && result.success) setRepartition(result.data);
    });
    return () => {
      annule = true;
    };
  }, [estRecruteur, statutPourEffet, paiementConfirmePourEffet, missionId]);

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

  const paiementConfirme = paiementStatut !== null && paiementStatut !== "en_attente";
  // Absent = devis créé avant ce chantier (parcours candidature
  // historique, parcours panier) : voir le commentaire sur DevisPayload.
  const statut = devis.statut ?? "acceptee";

  return (
    <div
      className={`w-full max-w-[420px] rounded-2xl border bg-background p-4 shadow-sm ${
        statut === "en_attente" ? "border-primary/30" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">Devis</p>
        {statut === "en_attente" && (
          <Pastille className="border-primary/25 bg-primary/10 text-primary">
            {estRecruteur ? "En attente de votre réponse" : "En attente de réponse du client"}
          </Pastille>
        )}
        {statut === "ajustement_demande" && (
          <Pastille className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
            Ajustement demandé
          </Pastille>
        )}
        {statut === "acceptee" && !paiementConfirme && (
          <Pastille className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300">
            Devis accepté
          </Pastille>
        )}
        {statut === "refusee" && (
          <Pastille className="border-destructive/25 bg-destructive/10 text-destructive">Devis décliné</Pastille>
        )}
      </div>
      <div className="mt-3 grid gap-2 text-[14.5px]">
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 text-foreground">
            {devis.prestation} · {devis.heureDebut} → {devis.heureFin}
          </span>
          <span className="shrink-0 font-semibold text-foreground">
            {Math.round(heuresEntre(devis.heureDebut, devis.heureFin) * 10) / 10} heures
          </span>
        </span>
        <span className="flex items-baseline justify-between gap-3 text-muted-foreground">
          <span>Taux horaire proposé</span>
          <span className="shrink-0">{devis.tarifHoraire} € / h</span>
        </span>
        <span className="h-px bg-border" />
        {repartition ? (
          <>
            <span className="flex items-baseline justify-between gap-3 text-muted-foreground">
              <span>Part du professionnel</span>
              <span className="shrink-0">{repartition.netPrestataire} €</span>
            </span>
            <span className="flex items-baseline justify-between gap-3 text-muted-foreground">
              <span>Frais de service ProParJour ({repartition.tauxCommission} %)</span>
              <span className="shrink-0">{repartition.commission} €</span>
            </span>
            <span className="flex items-baseline justify-between gap-3 font-semibold text-foreground">
              <span>Total à payer</span>
              <span className="shrink-0">{repartition.total} €</span>
            </span>
          </>
        ) : (
          <span className="flex items-baseline justify-between gap-3 font-semibold text-foreground">
            <span>Total de la proposition</span>
            <span className="shrink-0">{devis.montantTotal} €</span>
          </span>
        )}
      </div>

      {!estLeDernier ? (
        <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">
          Version remplacée par une proposition plus récente — voir ci-dessous.
        </p>
      ) : statut === "refusee" ? (
        <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">
          {estRecruteur ? "Vous avez décliné ce devis." : "Le client a décliné ce devis."}
        </p>
      ) : statut === "ajustement_demande" ? (
        <>
          <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">
            {devis.noteAjustement && <span className="block italic">« {devis.noteAjustement} »</span>}
            {estRecruteur
              ? "En attente d'un nouveau devis du professionnel."
              : "Vous pouvez envoyer un nouveau devis ci-dessous, avec les termes ajustés."}
          </p>
          {!estRecruteur && <DeclinerAjustementButton messageId={messageId} />}
        </>
      ) : statut === "en_attente" ? (
        estRecruteur ? (
          <ReponseDevisForm messageId={messageId} />
        ) : (
          <p className="mt-3.5 text-xs text-muted-foreground">En attente de la réponse du client.</p>
        )
      ) : paiementConfirme ? (
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
              <div className="flex gap-3">
                <Button size="xl" className="flex-1" onClick={handlePayer} disabled={chargement}>
                  {chargement && <Loader2 className="size-3.5 animate-spin" />}
                  Payer maintenant
                </Button>
              </div>
            )}
          </div>
        )
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">En attente du paiement du client.</p>
      )}
    </div>
  );
}
