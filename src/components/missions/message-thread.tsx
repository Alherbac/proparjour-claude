"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Send, Loader2, FileSignature, PlayCircle, FileText, CheckCircle2, TriangleAlert, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { envoyerMessage } from "@/app/actions/messages";
import { envoyerDevis } from "@/app/actions/missions";
import {
  declarerDebutMission,
  confirmerDebutMission,
  contesterDebutMission,
  declarerFinMission,
  confirmerHorairesFinMission,
  contesterHorairesFinMission,
} from "@/app/actions/execution-mission";
import { creerIntentionPaiementComplement, confirmerPaiementComplement } from "@/app/actions/paiement-complement";
import { laisserAvis } from "@/app/actions/avis";
import { heuresEntre, calculerMontantFinal } from "@/lib/duree";
import { repartitionLigne, type RepartitionLigne } from "@/lib/facturation";
import { ETAPES, calculerEtapeMission, indiceEtape } from "@/lib/etapes-mission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DevisCard, getStripePromise, type HistoriqueDevis } from "@/components/missions/devis-card";
import { cn } from "@/lib/utils";
import type { MessagesRow, PaiementStatutType } from "@/lib/supabase/database.types";
import type { DevisPayload, ExecutionPayload } from "@/lib/messages";
import type { ComplementPaiement } from "@/lib/missions";
import { Star } from "lucide-react";

export type DevisPrefill = {
  prestation: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  lieu: string;
  tarifHoraire: number;
};

/** Ligne de mission du contact de ce fil, avec son état d'exécution — voir missions/[id]/page.tsx::versLigneExecution. */
export type LigneExecution = {
  id: string;
  statutAcceptation: string;
  serviceFait: boolean;
  heureDebutPrevue: string;
  heureFinPrevue: string;
  tarifApplique: number;
  tarifFinal: number | null;
  heureDebutReelle: string | null;
  heureDebutStatut: "declaree" | "confirmee" | "contestee" | null;
  heureFinReelle: string | null;
  heureFinStatut: "declaree" | "confirmee" | "contestee" | null;
  /** Taux uniquement, jamais le montant total de la mission (confidentiel pour un prestataire). */
  tauxCommission: number;
};

function heureActuelle(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Tone = "green" | "amber" | "red" | "grey";

const TONE_CLASSES: Record<Tone, string> = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
  amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300",
  red: "border-primary/25 bg-primary/10 text-primary",
  grey: "border-border bg-secondary text-muted-foreground",
};

/**
 * Ligne d'événement système — niveau visuel B du dossier design §3 :
 * une seule ligne (pastille + libellé + heure), jamais une grosse
 * carte. Historique, jamais interactive : les actions vivent dans les
 * cartes "en attente" plus bas, qui lisent l'état ACTUEL de la ligne,
 * pas un message passé.
 */
/** Badge de statut du header de conversation — dossier design §5, mêmes couleurs que la pastille d'événement mais en pilule pleine. */
function BadgeEtape({ tone, label }: { tone: Tone; label: string }) {
  return <span className={cn("shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-bold", TONE_CLASSES[tone])}>{label}</span>;
}

function LigneEvenement({ tone, mark, label, time }: { tone: Tone; mark: string; label: string; time?: string }) {
  return (
    <div className="flex items-start gap-2.5 px-0.5 py-1.5">
      <span
        className={cn(
          "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
          TONE_CLASSES[tone],
        )}
      >
        {mark}
      </span>
      <span className="min-w-0 flex-1 text-[13px] leading-snug text-foreground/85">
        {label}
        {time && <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">{time}</span>}
      </span>
    </div>
  );
}

const EMOJI_DE_TETE = /^(🟢|✅|⚠️|❌|✏️|💳)\s*/;

const EXECUTION_STYLE: Record<ExecutionPayload["evenement"], { tone: Tone; mark: string }> = {
  debut_declare: { tone: "amber", mark: "●" },
  debut_confirme: { tone: "green", mark: "✓" },
  debut_conteste: { tone: "red", mark: "⚠" },
  fin_declaree: { tone: "amber", mark: "●" },
  fin_confirmee: { tone: "green", mark: "✓" },
  fin_contestee: { tone: "red", mark: "⚠" },
};

function heureDeMessage(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Carte chronologique d'un événement d'exécution — le texte vient de `contenu` (déjà rédigé côté serveur, execution-mission.ts), l'heure de `created_at`. L'émoji de tête de `contenu` est retiré : la pastille de LigneEvenement le remplace déjà, jamais les deux à la fois. */
function CarteExecution({ message }: { message: MessagesRow }) {
  const payload = message.metadata as unknown as ExecutionPayload;
  const style = EXECUTION_STYLE[payload.evenement] ?? { tone: "grey" as Tone, mark: "●" };
  const label = message.contenu.replace(EMOJI_DE_TETE, "");
  return <LigneEvenement tone={style.tone} mark={style.mark} label={label} time={heureDeMessage(message.created_at)} />;
}

/** Un message "systeme" porte son ton dans son emoji de tête (posé côté serveur, actions/missions.ts) — jamais un second champ à maintenir en double. */
function analyserMessageSysteme(contenu: string): { tone: Tone; mark: string; label: string } {
  const label = contenu.replace(EMOJI_DE_TETE, "");
  if (contenu.startsWith("✅") || contenu.startsWith("💳")) return { tone: "green", mark: "✓", label };
  if (contenu.startsWith("⚠️") || contenu.startsWith("❌")) return { tone: "red", mark: "⚠", label };
  if (contenu.startsWith("🟢") || contenu.startsWith("✏️")) return { tone: "amber", mark: "●", label };
  return { tone: "grey", mark: "●", label: contenu };
}

/**
 * Formulaire d'envoi de devis, côté prestataire — la seule façon
 * d'en créer un depuis la correction UX critique du parcours
 * candidature (voir envoyerDevis, actions/missions.ts). Pré-rempli
 * depuis les termes de la mission, éditable avant envoi.
 */
function EnvoyerDevisForm({
  missionId,
  destinataireId,
  prefill,
  reenvoi,
}: {
  missionId: string;
  destinataireId: string;
  prefill: DevisPrefill;
  reenvoi: boolean;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [tarifHoraire, setTarifHoraire] = useState(String(prefill.tarifHoraire));
  const [isPending, setIsPending] = useState(false);

  function dureeHeures() {
    const [h1, m1] = prefill.heureDebut.split(":").map(Number);
    const [h2, m2] = prefill.heureFin.split(":").map(Number);
    let minutes = h2 * 60 + m2 - (h1 * 60 + m1);
    if (minutes <= 0) minutes += 24 * 60;
    return minutes / 60;
  }

  async function envoyer() {
    const taux = Number(tarifHoraire);
    if (!Number.isFinite(taux) || taux <= 0) {
      toast.error("Indiquez un tarif horaire valide.");
      return;
    }
    setIsPending(true);
    const montantTotal = Math.round(taux * dureeHeures() * 100) / 100;
    const result = await envoyerDevis(missionId, destinataireId, {
      prestation: prefill.prestation,
      date: prefill.date,
      heureDebut: prefill.heureDebut,
      heureFin: prefill.heureFin,
      lieu: prefill.lieu,
      tarifHoraire: taux,
      montantTotal,
    });
    setIsPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Devis envoyé au client.");
    setOuvert(false);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <div className="mx-auto">
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOuvert(true)}>
          <FileSignature className="size-3.5" />
          {reenvoi ? "Envoyer un nouveau devis" : "Envoyer un devis"}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px] rounded-2xl border-[1.5px] border-primary bg-background p-4 shadow-sm">
      <p className="flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-ppj-red-text before:size-[7px] before:shrink-0 before:rounded-full before:bg-primary">Votre devis</p>
      <p className="mt-1.5 font-heading text-base font-semibold text-foreground">{prefill.prestation}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {prefill.heureDebut} – {prefill.heureFin} · {prefill.lieu}
      </p>
      <label className="mt-3 block text-xs font-medium text-muted-foreground">Tarif horaire proposé (€)</label>
      <Input
        type="number"
        min={0}
        step="0.5"
        value={tarifHoraire}
        onChange={(e) => setTarifHoraire(e.target.value)}
        className="mt-1"
      />
      <p className="mt-2 text-sm text-muted-foreground">
        Total pour {dureeHeures()} h : <span className="font-medium text-foreground">{Math.round(Number(tarifHoraire || 0) * dureeHeures() * 100) / 100} €</span>
      </p>
      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <Button size="xl" className="rounded-xl" onClick={envoyer} disabled={isPending}>
          {isPending && <Loader2 className="size-3.5 animate-spin" />}
          Envoyer le devis
        </Button>
        <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setOuvert(false)} disabled={isPending}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

/**
 * "J'ai commencé la mission" — déclaration précoce et optionnelle,
 * côté prestataire (voir declarerDebutMission, actions/execution-mission.ts).
 * Préremplie avec l'heure actuelle, modifiable avant confirmation.
 */
function DeclarerDebutForm({ ligneId }: { ligneId: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [heure, setHeure] = useState(heureActuelle());
  const [isPending, setIsPending] = useState(false);

  async function confirmer() {
    setIsPending(true);
    const result = await declarerDebutMission(ligneId, heure);
    setIsPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Début de mission déclaré.");
    setOuvert(false);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <div className="mx-auto">
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOuvert(true)}>
          <PlayCircle className="size-3.5" />
          J&apos;ai commencé la mission
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[380px] rounded-2xl border-[1.5px] border-primary bg-background p-4 shadow-sm">
      <p className="font-heading text-sm font-semibold text-foreground">À quelle heure avez-vous réellement commencé ?</p>
      <Input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} className="mt-2.5" />
      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <Button size="xl" className="rounded-xl" onClick={confirmer} disabled={isPending}>
          {isPending && <Loader2 className="size-3.5 animate-spin" />}
          Confirmer
        </Button>
        <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setOuvert(false)} disabled={isPending}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

/** Le client confirme ou conteste le début déclaré par le prestataire — jamais une transformation automatique (confirmerDebutMission / contesterDebutMission). */
function ReponseDebutCard({ ligneId, ligne }: { ligneId: string; ligne: LigneExecution }) {
  const router = useRouter();
  const [contestationOuverte, setContestationOuverte] = useState(false);
  const [motif, setMotif] = useState("");
  const [isPending, setIsPending] = useState<"confirmer" | "contester" | null>(null);

  async function confirmer() {
    setIsPending("confirmer");
    const result = await confirmerDebutMission(ligneId);
    setIsPending(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Début confirmé.");
    router.refresh();
  }

  async function contester() {
    setIsPending("contester");
    const result = await contesterDebutMission(ligneId, motif);
    setIsPending(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Désaccord signalé.");
    setContestationOuverte(false);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-2xl border border-primary/25 bg-background p-4 shadow-sm">
      <p className="text-sm text-foreground">
        Le prestataire indique avoir commencé la mission à <span className="font-semibold">{ligne.heureDebutReelle}</span>.
      </p>
      {contestationOuverte ? (
        <div className="mt-3 space-y-2.5">
          <Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif du désaccord (facultatif)" maxLength={500} />
          <div className="flex flex-wrap gap-2.5">
            <Button size="xl" variant="outline" className="rounded-xl text-destructive hover:text-destructive" onClick={contester} disabled={isPending !== null}>
              {isPending === "contester" && <Loader2 className="size-3.5 animate-spin" />}
              Envoyer le signalement
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setContestationOuverte(false)} disabled={isPending !== null}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2.5">
          <Button size="xl" className="rounded-xl" onClick={confirmer} disabled={isPending !== null}>
            {isPending === "confirmer" && <Loader2 className="size-3.5 animate-spin" />}
            Confirmer le début
          </Button>
          <Button size="xl" variant="outline" className="rounded-xl text-destructive hover:text-destructive" onClick={() => setContestationOuverte(true)} disabled={isPending !== null}>
            Signaler un désaccord
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * "Fin de la mission" → "Éditer la facture" — déclaration AUTORITAIRE
 * des deux heures réelles (voir declarerFinMission,
 * actions/execution-mission.ts) : c'est elle qui conditionne la
 * libération des fonds, jamais le début. L'aperçu (durée, tarif
 * horaire, brut/commission/net) est calculé ICI avec les mêmes
 * fonctions pures que le serveur (calculerMontantFinal, lib/duree.ts ;
 * repartitionLigne, lib/facturation.ts) — un aperçu instantané, jamais
 * la valeur retenue : declarerFinMission recalcule et persiste seul
 * le montant qui compte, jamais une valeur transmise par le navigateur.
 */
function EditerFactureForm({ ligneId, ligne }: { ligneId: string; ligne: LigneExecution }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [heureDebut, setHeureDebut] = useState(ligne.heureDebutReelle ?? heureActuelle());
  const [heureFin, setHeureFin] = useState(heureActuelle());
  const [isPending, setIsPending] = useState(false);

  const heuresIdentiques = heureDebut === heureFin;
  const apercu = !heuresIdentiques
    ? calculerMontantFinal({
        heureDebutPrevue: ligne.heureDebutPrevue,
        heureFinPrevue: ligne.heureFinPrevue,
        tarifApplique: ligne.tarifApplique,
        heureDebutReelle: heureDebut,
        heureFinReelle: heureFin,
      })
    : null;
  const repartition = apercu ? repartitionLigne({ tarif_applique: ligne.tarifApplique, tarif_final: apercu.montant }, ligne.tauxCommission) : null;

  async function confirmerEtEnvoyer() {
    if (heuresIdentiques) {
      toast.error("L'heure de début et l'heure de fin ne peuvent pas être identiques.");
      return;
    }
    setIsPending(true);
    const result = await declarerFinMission(ligneId, heureDebut, heureFin);
    setIsPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Fin de mission envoyée au client.");
    setOuvert(false);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <div className="mx-auto flex flex-col items-center gap-1.5">
        {ligne.heureFinStatut === "contestee" && (
          <p className="max-w-[380px] text-center text-xs text-destructive">
            Le client a signalé un désaccord sur les horaires (voir le message ci-dessus). Vous pouvez redéclarer.
          </p>
        )}
        {ligne.heureFinStatut === "declaree" && (
          <p className="max-w-[380px] text-center text-xs text-muted-foreground">En attente de la confirmation du client.</p>
        )}
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOuvert(true)}>
          <FileText className="size-3.5" />
          {ligne.heureFinStatut === "contestee" ? "Redéclarer la fin de mission" : ligne.heureFinStatut === "declaree" ? "Modifier la déclaration" : "Fin de la mission"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-2xl border-[1.5px] border-primary bg-background p-4 shadow-sm">
      <p className="flex items-center gap-2 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-ppj-red-text before:size-[7px] before:shrink-0 before:rounded-full before:bg-primary">Éditer la facture</p>
      <p className="mt-1.5 text-sm text-muted-foreground">Temps réellement effectué</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Début réel</label>
          <Input type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Fin réelle</label>
          <Input type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} />
        </div>
      </div>

      {heuresIdentiques ? (
        <p className="mt-3 text-xs font-medium text-destructive">L&apos;heure de début et de fin ne peuvent pas être identiques.</p>
      ) : (
        apercu &&
        repartition && (
          <div className="mt-3.5 space-y-1.5 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Durée</span>
              <span>{Math.round(apercu.dureeHeures * 100) / 100} h</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tarif horaire</span>
              <span>{apercu.tarifHoraire.toFixed(2)} €/h</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Prestation</span>
              <span>{repartition.prestation.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Commission ProParJour ({repartition.tauxCommission}%)</span>
              <span>{repartition.commission.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Total client</span>
              <span>{repartition.totalClient.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-foreground">
              <span>Votre net</span>
              <span>{repartition.netPrestataire.toFixed(2)} €</span>
            </div>
            {Math.abs(apercu.montant - ligne.tarifApplique) < 0.005 ? (
              <p className="text-xs font-normal text-muted-foreground">
                Identique au montant déjà accepté et séquestré — aucun nouveau paiement ne sera demandé.
              </p>
            ) : apercu.montant > ligne.tarifApplique ? (
              <p className="text-xs font-normal text-amber-700 dark:text-amber-300">
                Dépasse le montant déjà séquestré ({ligne.tarifApplique.toFixed(2)} €) — un complément de paiement sera nécessaire.
              </p>
            ) : (
              <p className="text-xs font-normal text-muted-foreground">
                Réduit au prorata du temps effectué (montant initial séquestré : {ligne.tarifApplique.toFixed(2)} €).
              </p>
            )}
          </div>
        )
      )}

      <div className="mt-3.5 flex flex-wrap gap-2.5">
        <Button size="xl" className="rounded-xl" onClick={confirmerEtEnvoyer} disabled={isPending || heuresIdentiques}>
          {isPending && <Loader2 className="size-3.5 animate-spin" />}
          Confirmer et envoyer
        </Button>
        <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setOuvert(false)} disabled={isPending}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

/**
 * Le client vérifie la fin déclarée et confirme (les horaires ET le
 * montant sont validés — le serveur recalcule et revérifie, jamais
 * une valeur affichée ici) ou conteste (mécanisme léger, distinct de
 * "Contester" au niveau mission — voir contesterHorairesFinMission).
 */
function ReponseFinCard({ ligneId, ligne }: { ligneId: string; ligne: LigneExecution }) {
  const router = useRouter();
  const [contestationOuverte, setContestationOuverte] = useState(false);
  const [motif, setMotif] = useState("");
  const [isPending, setIsPending] = useState<"confirmer" | "contester" | null>(null);

  const duree = ligne.heureDebutReelle && ligne.heureFinReelle ? heuresEntre(ligne.heureDebutReelle, ligne.heureFinReelle) : 0;
  const repartition = repartitionLigne({ tarif_applique: ligne.tarifApplique, tarif_final: ligne.tarifFinal }, ligne.tauxCommission);

  async function confirmer() {
    setIsPending("confirmer");
    const result = await confirmerHorairesFinMission(ligneId);
    setIsPending(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.data.complementNecessaire
        ? "Horaires confirmés — ce montant dépasse le séquestre, un complément de paiement doit être traité avant la libération."
        : "Service fait confirmé — paiement libéré.",
    );
    router.refresh();
  }

  async function contester() {
    setIsPending("contester");
    const result = await contesterHorairesFinMission(ligneId, motif);
    setIsPending(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Désaccord signalé — le paiement reste bloqué.");
    setContestationOuverte(false);
    router.refresh();
  }

  const depasseMontantInitial = repartition.totalClient > ligne.tarifApplique + 0.005;

  return (
    <div className="mx-auto w-full max-w-[460px] rounded-2xl border border-primary/25 bg-background p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Temps de travail déclaré</p>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11.5px] font-medium text-primary">À confirmer</span>
      </div>
      <div className="mt-2.5 space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Début</span>
          <span className="text-foreground">{ligne.heureDebutReelle}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Fin</span>
          <span className="text-foreground">{ligne.heureFinReelle}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Durée</span>
          <span className="text-foreground">{Math.round(duree * 100) / 100} h</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Prestation</span>
          <span className="text-foreground">{repartition.prestation.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Commission ProParJour ({repartition.tauxCommission}%)</span>
          <span className="text-foreground">{repartition.commission.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-foreground">
          <span>Total à votre charge</span>
          <span>{repartition.totalClient.toFixed(2)} €</span>
        </div>
      </div>
      {!depasseMontantInitial ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {Math.abs(repartition.totalClient - ligne.tarifApplique) < 0.005
            ? "Identique au montant déjà accepté et séquestré — aucun nouveau paiement."
            : `Montant réduit au prorata du temps réellement effectué (montant initial séquestré : ${ligne.tarifApplique.toFixed(2)} €).`}
        </p>
      ) : (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
          Dépasse le montant déjà séquestré ({ligne.tarifApplique.toFixed(2)} €) — un complément de paiement sera nécessaire après confirmation.
        </p>
      )}

      {contestationOuverte ? (
        <div className="mt-3.5 space-y-2.5">
          <Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif du désaccord (facultatif)" maxLength={500} />
          <div className="flex flex-wrap gap-2.5">
            <Button size="xl" variant="outline" className="rounded-xl text-destructive hover:text-destructive" onClick={contester} disabled={isPending !== null}>
              {isPending === "contester" && <Loader2 className="size-3.5 animate-spin" />}
              Envoyer le signalement
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => setContestationOuverte(false)} disabled={isPending !== null}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          <Button size="xl" className="rounded-xl" onClick={confirmer} disabled={isPending !== null}>
            {isPending === "confirmer" ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Confirmer le service fait
          </Button>
          <Button size="xl" variant="outline" className="rounded-xl text-destructive hover:text-destructive" onClick={() => setContestationOuverte(true)} disabled={isPending !== null}>
            <TriangleAlert className="size-3.5" />
            Contester les horaires
          </Button>
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        En confirmant le service fait, vous confirmez que la prestation a été réalisée. Cette confirmation déclenche immédiatement la libération du paiement selon les conditions de ProParJour.
      </p>
    </div>
  );
}

/**
 * Formulaire de paiement du complément (heures supplémentaires) —
 * même primitives Stripe Elements que PaiementForm (devis-card.tsx),
 * jamais un second pipeline : même stripe.confirmPayment, puis
 * confirmerPaiementComplement (actions/paiement-complement.ts) revérifie
 * le PaymentIntent auprès de Stripe avant d'écrire quoi que ce soit.
 */
function PaiementComplementForm({ missionId, montant }: { missionId: string; montant: number }) {
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

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (confirmError || !paymentIntent) {
      setErreur(confirmError?.message ?? "Le paiement a échoué.");
      setSubmitting(false);
      return;
    }

    const result = await confirmerPaiementComplement(missionId, paymentIntent.id);
    if (!result.success) {
      setErreur(result.error);
      setSubmitting(false);
      return;
    }
    toast.success("Complément réglé — le service fait peut être confirmé.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <PaymentElement />
      {erreur && <p className="text-xs font-medium text-destructive">{erreur}</p>}
      <Button type="submit" size="sm" className="w-full rounded-xl" disabled={submitting || !stripe}>
        {submitting && <Loader2 className="size-3.5 animate-spin" />}
        Payer le complément — {montant.toFixed(2)} €
      </Button>
    </form>
  );
}

/**
 * Carte "Complément de paiement" — apparaît côté CLIENT uniquement
 * quand le temps réellement effectué dépasse le devis initial et que
 * le complément n'est pas encore réglé (paiements.complement_paye,
 * migration 0060). Le service fait reste bloqué (garde ajoutée à
 * confirmerServiceFait, actions/missions.ts) tant que cette carte est
 * affichée.
 */
function PayerComplementCard({ missionId, montant }: { missionId: string; montant: number }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const stripePromise = getStripePromise();

  async function handlePayer() {
    setChargement(true);
    setErreur(null);
    const result = await creerIntentionPaiementComplement(missionId);
    setChargement(false);
    if (!result.success) {
      setErreur(result.error);
      return;
    }
    setClientSecret(result.data.clientSecret);
  }

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-2xl border border-amber-300 bg-amber-50/40 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/5">
      <p className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        <ShieldAlert className="size-3.5" /> Complément de paiement
      </p>
      <p className="mt-1.5 text-sm text-foreground">
        Le temps réellement effectué dépasse le devis initial. Un complément de{" "}
        <span className="font-semibold">{montant.toFixed(2)} €</span> est nécessaire avant de pouvoir confirmer le service fait.
      </p>
      {clientSecret && stripePromise ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaiementComplementForm missionId={missionId} montant={montant} />
        </Elements>
      ) : (
        <div className="mt-3">
          {erreur && <p className="mb-2 text-xs font-medium text-destructive">{erreur}</p>}
          {!stripePromise ? (
            <p className="text-xs font-medium text-destructive">Le paiement n&apos;est pas encore configuré sur cette instance.</p>
          ) : (
            <Button size="xl" className="w-full rounded-xl" onClick={handlePayer} disabled={chargement}>
              {chargement && <Loader2 className="size-3.5 animate-spin" />}
              Payer le complément
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** "LUNDI 14 SEPTEMBRE" — séparateur de jour du fil (dossier design §12/fil chronologique). Capitalisation manuelle, comme dateLongueFr. */
function jourLabel(iso: string): string {
  const brut = new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return (brut.charAt(0).toUpperCase() + brut.slice(1)).toUpperCase();
}

function jourCle(iso: string): string {
  return iso.slice(0, 10);
}

function SeparateurJour({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="h-px flex-1 bg-border" />
      <span className="shrink-0 font-mono text-[10.5px] tracking-wide text-muted-foreground/80">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/**
 * Colonne latérale — dossier design §12 : "Où en est la mission" et
 * "Le devis en vigueur" utilisent EXACTEMENT la même source de calcul
 * que le reste de la messagerie (repartitionLigne, lib/facturation.ts)
 * et le même état réel (etapes-mission.ts) — jamais une deuxième
 * formule, jamais un sélecteur de rôle ou d'étape (contrairement à la
 * maquette de démonstration : ici le rôle vient de la session,
 * l'étape de l'état réel, voir §13 de la correction produit).
 */
function EtatMissionAside({
  etapeIndex,
  etapeLabel,
  hint,
  repartition,
  note,
  estRecruteur,
}: {
  etapeIndex: number;
  etapeLabel: string;
  hint: string;
  repartition: RepartitionLigne | null;
  note: string;
  estRecruteur: boolean;
}) {
  const pct = Math.round(((etapeIndex + 1) / ETAPES.length) * 100);
  return (
    <div className="grid gap-3.5 min-[900px]:sticky min-[900px]:top-5">
      <div className="rounded-2xl border border-border bg-background p-4">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Où en est la mission</p>
        <p className="mt-2 font-display-serif text-xl text-foreground">{etapeLabel}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{hint}</p>
        <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-muted-foreground/80">
          <span>Étape {etapeIndex + 1} / {ETAPES.length}</span>
          <span>{pct} %</span>
        </div>
      </div>

      {repartition && (
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Le devis en vigueur</p>
          <div className="mt-2.5 grid gap-1.5 text-[13px]">
            <div className="flex items-baseline justify-between gap-3 text-muted-foreground">
              <span>Prestation</span>
              <span className="shrink-0 font-mono text-foreground">{repartition.prestation.toFixed(2)} €</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 text-muted-foreground">
              <span>Commission ProParJour</span>
              <span className="shrink-0 font-mono text-foreground">{repartition.commission.toFixed(2)} €</span>
            </div>
            {estRecruteur ? (
              <div className="flex items-baseline justify-between gap-3 font-semibold text-foreground">
                <span>Total à votre charge</span>
                <span className="shrink-0 font-mono">{repartition.totalClient.toFixed(2)} €</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-3 text-muted-foreground">
                  <span>Total client</span>
                  <span className="shrink-0 font-mono text-foreground">{repartition.totalClient.toFixed(2)} €</span>
                </div>
                <div className="flex items-baseline justify-between gap-3 font-semibold text-foreground">
                  <span>Votre net</span>
                  <span className="shrink-0 font-mono">{repartition.netPrestataire.toFixed(2)} €</span>
                </div>
              </>
            )}
          </div>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">{note}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Carte d'évaluation — n'apparaît qu'après mission terminée + service
 * fait + paiement libéré (dossier design §11), jamais avant. Réutilise
 * laisserAvis (actions/avis.ts) tel quel, aucune deuxième règle métier.
 */
function CarteEvaluation({ ligneId, autreNom }: { ligneId: string; autreNom: string }) {
  const router = useRouter();
  const [note, setNote] = useState(0);
  const [survol, setSurvol] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function publier() {
    if (note < 1) {
      setErreur("Choisissez une note avant d'envoyer.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    const result = await laisserAvis(ligneId, note, commentaire);
    setEnvoi(false);
    if (!result.success) {
      setErreur(result.error);
      return;
    }
    toast.success("Avis publié.");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[420px] rounded-2xl border border-border bg-background p-4 shadow-sm">
      <p className="font-display-serif text-lg text-foreground">Votre mission est terminée</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        Votre avis sur {autreNom} aide les prochains utilisateurs de ProParJour à choisir.
      </p>
      <div className="mt-3.5 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((valeur) => (
          <button
            key={valeur}
            type="button"
            aria-label={`${valeur} étoile${valeur > 1 ? "s" : ""}`}
            onMouseEnter={() => setSurvol(valeur)}
            onMouseLeave={() => setSurvol(0)}
            onClick={() => setNote(valeur)}
            className="grid size-11 place-items-center rounded-xl border border-border bg-secondary/40"
          >
            <Star className={cn("size-[19px]", valeur <= (survol || note) ? "fill-primary text-primary" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      <textarea
        value={commentaire}
        onChange={(e) => setCommentaire(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Commentaire facultatif"
        className="mt-3.5 w-full resize-none rounded-xl border border-border bg-secondary/30 px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {erreur && <p className="mt-2 text-xs font-medium text-destructive">{erreur}</p>}
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <Button size="xl" className="rounded-xl" onClick={publier} disabled={envoi || note < 1}>
          {envoi && <Loader2 className="size-3.5 animate-spin" />}
          Publier mon avis
        </Button>
        <span className="text-xs text-muted-foreground">{note ? `${note} sur 5` : "Une note est nécessaire"}</span>
      </div>
    </div>
  );
}

export function MessageThread({
  missionId,
  moiId,
  autreId,
  autreNom,
  messagesInitiaux,
  estRecruteur,
  paiementStatut,
  devisPrefill,
  ligne,
  complement,
  avisDejaEnvoye = false,
  sousLigne,
  lienDetail,
  sansCadre = false,
}: {
  missionId: string;
  moiId: string;
  autreId: string;
  autreNom: string;
  messagesInitiaux: MessagesRow[];
  estRecruteur: boolean;
  paiementStatut: PaiementStatutType | null;
  devisPrefill: DevisPrefill | null;
  /** Ligne de mission du contact de ce fil — null si ce fil n'a pas (ou plus) de ligne associée. */
  ligne: LigneExecution | null;
  /** Complément pour heures supplémentaires (migration 0060) — mission entière, pas par ligne. */
  complement: ComplementPaiement;
  /** Vous avez déjà laissé un avis à ce contact (table `avis`) — masque la carte d'évaluation une fois envoyé. */
  avisDejaEnvoye?: boolean;
  /** Sous-ligne du header de conversation (dossier design §5) — ex. "Hôte / Hôtesse d'accueil · Mission #2309". */
  sousLigne?: string;
  /** Ancre/lien du bouton "La mission" du header — vers la fiche détaillée, plus bas sur la même page. */
  lienDetail?: string;
  /** Écran "Messagerie" (deux colonnes) : le nom et le cadre sont déjà
   * portés par l'en-tête de la page, pas besoin d'un second cadre ni
   * d'un second nom ici — voir tableau-de-bord/messagerie/page.tsx. */
  sansCadre?: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(messagesInitiaux);
  const [messagesPrecedents, setMessagesPrecedents] = useState(messagesInitiaux);
  if (messagesInitiaux !== messagesPrecedents) {
    setMessagesPrecedents(messagesInitiaux);
    setMessages(messagesInitiaux);
  }
  const [texte, setTexte] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let annule = false;

    // createBrowserClient (@supabase/ssr) lit la session dans les
    // cookies de façon asynchrone : s'abonner immédiatement au montage
    // peut authentifier le websocket Realtime en anonyme avant que le
    // JWT ne soit attaché. Le canal atteint quand même SUBSCRIBED, mais
    // la RLS de `messages` (participants uniquement) filtre alors tout
    // silencieusement côté serveur — trouvé en direct : aucune erreur,
    // aucun événement ne remontait jamais. Attendre la session avant de
    // s'abonner règle le problème.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (annule || !session) return;
      channel = supabase
        .channel(`messages-${missionId}-${[moiId, autreId].sort().join("-")}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `mission_id=eq.${missionId}` },
          (payload) => {
            const msg = payload.new as MessagesRow;
            const concerne =
              (msg.expediteur_id === moiId && msg.destinataire_id === autreId) ||
              (msg.expediteur_id === autreId && msg.destinataire_id === moiId);
            if (!concerne) return;
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            // Un ajustement de devis demandé/accepté/décliné arrive
            // toujours accompagné d'un message système (INSERT), mais
            // le VRAI changement à afficher (nouveau statut du devis,
            // bouton "Envoyer un nouveau devis") vit dans le
            // `metadata` d'un message déjà chargé (mis à jour par
            // l'action serveur, jamais réinséré) — un simple ajout
            // local ne le voit pas. router.refresh() récupère les
            // props serveur à jour (statut du devis, paiementStatut...)
            // sans perdre le message qu'on vient d'ajouter localement.
            router.refresh();
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages", filter: `mission_id=eq.${missionId}` },
          (payload) => {
            const msg = payload.new as MessagesRow;
            const concerne =
              (msg.expediteur_id === moiId && msg.destinataire_id === autreId) ||
              (msg.expediteur_id === autreId && msg.destinataire_id === moiId);
            if (!concerne) return;
            // Cas défensif : un devis dont le statut change SANS
            // message système accompagnateur (aucun chemin actuel ne
            // fait ça, mais rien ne le garantit pour toujours) doit
            // quand même rafraîchir la carte.
            router.refresh();
          },
        )
        .subscribe();
    });

    return () => {
      annule = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [missionId, moiId, autreId, router]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleEnvoyer() {
    const contenu = texte.trim();
    if (!contenu || envoi) return;
    setEnvoi(true);
    setTexte("");
    const result = await envoyerMessage(missionId, autreId, contenu);
    setEnvoi(false);
    if (!result.success) {
      setTexte(contenu);
      toast.error(result.error);
    }
  }

  // Compaction des versions de devis (dossier design §6) : seule la
  // dernière est rendue en carte pleine (DevisCard, estLeDernier),
  // les précédentes deviennent des lignes repliées dans son historique
  // — jamais une carte pleine chacune comme avant cette correction.
  const devisMessages = messages.filter((m) => m.type === "devis");
  const dernierDevisMessage = devisMessages[devisMessages.length - 1];
  const dernierDevisId = dernierDevisMessage?.id;
  const devisStatutActuel = dernierDevisMessage ? (dernierDevisMessage.metadata as DevisPayload).statut : undefined;
  const devisRevise = devisMessages.length > 1;
  const historiqueDevis: HistoriqueDevis[] = devisMessages.slice(0, -1).map((m, i) => {
    const payload = m.metadata as unknown as DevisPayload;
    return {
      version: i + 1,
      detail: `${payload.heureDebut} → ${payload.heureFin} · ${Math.round(heuresEntre(payload.heureDebut, payload.heureFin) * 10) / 10} h`,
      montant: `${payload.montantTotal} €`,
    };
  });

  // Étape réelle du parcours (etapes-mission.ts) et montants affichés
  // dans la colonne latérale — mêmes fonctions pures que le reste de
  // la messagerie (repartitionLigne, lib/facturation.ts), jamais un
  // deuxième calcul (dossier design §12/§16 de la correction produit).
  const complementEnAttente = Boolean(complement && !complement.paye);
  const etape = calculerEtapeMission({
    devisStatut: devisStatutActuel,
    devisRevise,
    paiementStatut,
    heureDebutStatut: ligne?.heureDebutStatut ?? null,
    heureFinStatut: ligne?.heureFinStatut ?? null,
    serviceFait: ligne?.serviceFait ?? false,
    complementEnAttente,
    avisEnvoye: avisDejaEnvoye,
  });
  const etapeHint = indiceEtape(etape.id, estRecruteur, complementEnAttente);
  const repartitionAside = ligne
    ? repartitionLigne({ tarif_applique: ligne.tarifApplique, tarif_final: ligne.tarifFinal }, ligne.tauxCommission)
    : null;
  const asideNote = ligne?.heureFinStatut
    ? "Montants du temps réellement déclaré, transmis pour confirmation."
    : "Le total client comprend déjà la commission ProParJour.";
  const peutEvaluer = Boolean(ligne?.serviceFait && paiementStatut === "libere");

  // Fil chronologique (dossier design §12) : séparateurs de jour +
  // événements/cartes dans l'ordre réel des messages. Une version de
  // devis remplacée est sautée ici (elle vit désormais dans
  // l'historique replié de la dernière, ci-dessus), jamais rendue en
  // double.
  let dernierJourAffiche: string | null = null;
  const items: ReactNode[] = [];
  for (const m of messages) {
    if (m.type === "devis" && m.id !== dernierDevisId) continue;
    const jour = jourCle(m.created_at);
    if (jour !== dernierJourAffiche) {
      items.push(<SeparateurJour key={`jour-${jour}`} label={jourLabel(m.created_at)} />);
      dernierJourAffiche = jour;
    }
    if (m.type === "devis") {
      items.push(
        <DevisCard
          key={m.id}
          missionId={missionId}
          messageId={m.id}
          devis={m.metadata as unknown as DevisPayload}
          estRecruteur={estRecruteur}
          paiementStatut={paiementStatut}
          estLeDernier
          historique={historiqueDevis}
          tauxCommission={ligne?.tauxCommission ?? null}
        />,
      );
    } else if (m.type === "execution") {
      items.push(<CarteExecution key={m.id} message={m} />);
    } else if (m.type === "systeme") {
      const { tone, mark, label } = analyserMessageSysteme(m.contenu);
      items.push(<LigneEvenement key={m.id} tone={tone} mark={mark} label={label} time={heureDeMessage(m.created_at)} />);
    } else {
      items.push(
        <div key={m.id} className={cn("flex w-fit max-w-[72%] flex-col gap-1", m.expediteur_id === moiId ? "ml-auto items-end" : "items-start")}>
          <div
            className={cn(
              "px-[14px] py-[11px] text-[14.5px] leading-[1.5]",
              m.expediteur_id === moiId
                ? "rounded-[16px_16px_4px_16px] bg-foreground text-background"
                : "rounded-[16px_16px_16px_4px] border border-border bg-background text-foreground",
            )}
          >
            {m.contenu}
          </div>
          <span className="px-0.5 text-[11px] text-muted-foreground/70">
            {heureDeMessage(m.created_at)}
            {m.expediteur_id === moiId && m.lu ? " · Lu" : ""}
          </span>
        </div>,
      );
    }
  }

  return (
    <div className={cn(!sansCadre && "grid grid-cols-1 items-start gap-5 min-[900px]:grid-cols-[minmax(0,1fr)_300px]")}>
      <div className={cn(sansCadre ? "flex h-full flex-col" : "overflow-hidden rounded-[20px] border border-border bg-background")}>
        {!sansCadre && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="size-10 shrink-0 rounded-xl"
                style={{ background: "repeating-linear-gradient(135deg, var(--border) 0px, var(--border) 5px, var(--secondary) 5px, var(--secondary) 10px)" }}
              />
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-foreground">{autreNom}</p>
                {sousLigne && <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{sousLigne}</p>}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <BadgeEtape tone={ETAPES[etape.index].tone} label={ETAPES[etape.index].statutHeader} />
              {lienDetail && (
                <a
                  href={lienDetail}
                  className="inline-flex min-h-[38px] items-center rounded-[10px] border border-border bg-background px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:border-foreground"
                >
                  La mission
                </a>
              )}
            </div>
          </div>
        )}
        <div className={cn("space-y-1", sansCadre ? "flex-1 overflow-y-auto p-4 sm:p-6" : "p-5")}>
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun message pour l&apos;instant.</p>
          )}
          {items}
          {!estRecruteur && paiementStatut === "en_attente" && devisPrefill && (!dernierDevisMessage || devisStatutActuel === "ajustement_demande") && (
            <EnvoyerDevisForm
              missionId={missionId}
              destinataireId={autreId}
              prefill={devisPrefill}
              reenvoi={Boolean(dernierDevisMessage)}
            />
          )}
          {/*
            Suivi d'exécution — ligne du contact de ce fil uniquement,
            et seulement si elle est acceptée (une candidature refusée
            ou en attente n'a rien à déclarer). Début : précoce,
            optionnel, jamais bloquant. Fin : autoritaire, c'est elle qui
            conditionne "Service fait" (voir le garde ajouté à
            confirmerServiceFait, actions/missions.ts).
          */}
          {ligne && ligne.statutAcceptation === "acceptee" && (
            <>
              {!estRecruteur && !ligne.heureDebutStatut && <DeclarerDebutForm ligneId={ligne.id} />}
              {estRecruteur && ligne.heureDebutStatut === "declaree" && <ReponseDebutCard ligneId={ligne.id} ligne={ligne} />}
              {!estRecruteur && ligne.heureFinStatut !== "confirmee" && <EditerFactureForm ligneId={ligne.id} ligne={ligne} />}
              {estRecruteur && ligne.heureFinStatut === "declaree" && <ReponseFinCard ligneId={ligne.id} ligne={ligne} />}
            </>
          )}
          {/*
            Heures supplémentaires (migration 0060) : une fois les
            horaires confirmés, si le nouveau total dépasse le montant
            déjà séquestré, le client doit régler le complément avant que
            "Service fait" puisse être confirmé (garde dans
            confirmerServiceFait, actions/missions.ts).
          */}
          {estRecruteur && complement && !complement.paye && <PayerComplementCard missionId={missionId} montant={complement.montantDu} />}
          {/*
            Évaluation (dossier design §11) — jamais avant mission
            terminée + service fait + paiement libéré. Les deux rôles
            peuvent noter leur contrepartie (règle produit existante,
            table `avis` — voir page.tsx), contrairement à la maquette
            de démonstration qui ne montre que le côté client.
          */}
          {peutEvaluer && ligne && !avisDejaEnvoye && <CarteEvaluation ligneId={ligne.id} autreNom={autreNom} />}
          {peutEvaluer && avisDejaEnvoye && (
            <LigneEvenement tone="green" mark="✓" label={estRecruteur ? `Avis envoyé à ${autreNom}` : "Avis reçu du client"} />
          )}
          <div ref={finRef} />
        </div>
        <div className={cn("border-t border-border", sansCadre ? "p-4 sm:p-6" : "p-3")}>
          <div className="flex items-end gap-2.5">
            <Input
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleEnvoyer();
                }
              }}
              placeholder="Écrire un message..."
              className="h-[50px] min-w-0 flex-1 rounded-[14px] px-4 text-[15px]"
            />
            <Button size="xl" className="shrink-0 px-3.5 sm:px-6" disabled={envoi} onClick={handleEnvoyer}>
              <Send className="size-4" />
              <span className="hidden sm:inline">Envoyer</span>
            </Button>
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground/80">
            Les coordonnées personnelles restent masquées jusqu&apos;à la validation de la mission.
          </p>
        </div>
      </div>
      {!sansCadre && (
        <EtatMissionAside
          etapeIndex={etape.index}
          etapeLabel={etape.label}
          hint={etapeHint}
          repartition={repartitionAside}
          note={asideNote}
          estRecruteur={estRecruteur}
        />
      )}
    </div>
  );
}
