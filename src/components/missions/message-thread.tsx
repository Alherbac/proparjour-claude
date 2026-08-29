"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { envoyerMessage } from "@/app/actions/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DevisCard } from "@/components/missions/devis-card";
import { cn } from "@/lib/utils";
import type { MessagesRow, PaiementStatutType } from "@/lib/supabase/database.types";
import type { DevisPayload } from "@/lib/messages";

export function MessageThread({
  missionId,
  moiId,
  autreId,
  autreNom,
  messagesInitiaux,
  estRecruteur,
  paiementStatut,
}: {
  missionId: string;
  moiId: string;
  autreId: string;
  autreNom: string;
  messagesInitiaux: MessagesRow[];
  estRecruteur: boolean;
  paiementStatut: PaiementStatutType | null;
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
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{autreNom}</p>
      </div>
      <div className="max-h-[32rem] space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun message pour l&apos;instant.</p>
        )}
        {messages.map((m) =>
          m.type === "devis" ? (
            <DevisCard
              key={m.id}
              missionId={missionId}
              devis={m.metadata as unknown as DevisPayload}
              estRecruteur={estRecruteur}
              paiementStatut={paiementStatut}
            />
          ) : m.type === "systeme" ? (
            <p
              key={m.id}
              className="mx-auto max-w-[85%] rounded-full bg-secondary px-3 py-1.5 text-center text-xs text-muted-foreground"
            >
              {m.contenu}
            </p>
          ) : (
            <div
              key={m.id}
              className={cn(
                "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                m.expediteur_id === moiId
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {m.contenu}
            </div>
          ),
        )}
        <div ref={finRef} />
      </div>
      <div className="flex items-center gap-2 border-t border-border p-3">
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
        />
        <Button size="icon" className="shrink-0 rounded-full" disabled={envoi} onClick={handleEnvoyer}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
