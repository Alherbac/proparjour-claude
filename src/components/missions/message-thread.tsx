"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, FileSignature } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { envoyerMessage } from "@/app/actions/messages";
import { envoyerDevis } from "@/app/actions/missions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DevisCard } from "@/components/missions/devis-card";
import { cn } from "@/lib/utils";
import type { MessagesRow, PaiementStatutType } from "@/lib/supabase/database.types";
import type { DevisPayload } from "@/lib/messages";

export type DevisPrefill = {
  prestation: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  lieu: string;
  tarifHoraire: number;
};

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
    <div className="w-full max-w-[420px] rounded-2xl border border-primary/30 bg-background p-4 shadow-sm">
      <p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">Votre devis</p>
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
        <Button size="sm" className="rounded-xl" onClick={envoyer} disabled={isPending}>
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

export function MessageThread({
  missionId,
  moiId,
  autreId,
  autreNom,
  messagesInitiaux,
  estRecruteur,
  paiementStatut,
  devisPrefill,
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
  /** Écran "Messagerie" (deux colonnes) : le nom et le cadre sont déjà
   * portés par l'en-tête de la page, pas besoin d'un second cadre ni
   * d'un second nom ici — voir tableau-de-bord/messagerie/page.tsx. */
  sansCadre?: boolean;
}) {
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
          },
        )
        .subscribe();
    });

    return () => {
      annule = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [missionId, moiId, autreId]);

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

  return (
    <div className={cn(sansCadre ? "flex h-full flex-col" : "overflow-hidden rounded-2xl border border-border bg-background")}>
      {!sansCadre && (
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{autreNom}</p>
        </div>
      )}
      <div className={cn("space-y-2", sansCadre ? "flex-1 overflow-y-auto p-4 sm:p-6" : "max-h-[32rem] overflow-y-auto p-4")}>
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun message pour l&apos;instant.</p>
        )}
        {(() => {
          const dernierDevisId = [...messages].reverse().find((msg) => msg.type === "devis")?.id;
          return messages.map((m) =>
            m.type === "devis" ? (
              <DevisCard
                key={m.id}
                missionId={missionId}
                messageId={m.id}
                devis={m.metadata as unknown as DevisPayload}
                estRecruteur={estRecruteur}
                paiementStatut={paiementStatut}
                estLeDernier={m.id === dernierDevisId}
              />
            ) : m.type === "systeme" ? (
            <p
              key={m.id}
              className="mx-auto max-w-[85%] rounded-full bg-secondary px-3 py-1.5 text-center text-xs text-muted-foreground"
            >
              {m.contenu}
            </p>
          ) : (
            <div key={m.id} className={cn("flex w-fit max-w-[62%] flex-col gap-1", m.expediteur_id === moiId ? "ml-auto items-end" : "items-start")}>
              <div
                className={cn(
                  "px-[18px] py-3.5 text-[14.5px] leading-[1.55]",
                  m.expediteur_id === moiId
                    ? "rounded-[16px_16px_4px_16px] bg-foreground text-background"
                    : "rounded-[16px_16px_16px_4px] border border-border bg-background text-foreground",
                )}
              >
                {m.contenu}
              </div>
              <span className="px-0.5 text-[11px] text-muted-foreground/70">
                {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                {m.expediteur_id === moiId && m.lu ? " · Lu" : ""}
              </span>
            </div>
          ),
          );
        })()}
        {!estRecruteur && paiementStatut === "en_attente" && devisPrefill && (() => {
          const dernierDevis = [...messages].reverse().find((m) => m.type === "devis");
          const statutDernierDevis = dernierDevis ? (dernierDevis.metadata as { statut?: string } | null)?.statut : undefined;
          const peutEnvoyer = !dernierDevis || statutDernierDevis === "ajustement_demande";
          if (!peutEnvoyer) return null;
          return (
            <EnvoyerDevisForm
              missionId={missionId}
              destinataireId={autreId}
              prefill={devisPrefill}
              reenvoi={Boolean(dernierDevis)}
            />
          );
        })()}
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
            className="h-[50px] rounded-[14px] px-4 text-[15px]"
          />
          <Button size="xl" className="shrink-0" disabled={envoi} onClick={handleEnvoyer}>
            <Send className="size-4" />
            Envoyer
          </Button>
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground/80">
          Les coordonnées personnelles restent masquées jusqu&apos;à la validation de la mission.
        </p>
      </div>
    </div>
  );
}
