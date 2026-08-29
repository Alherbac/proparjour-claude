import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { ConversationAdmin } from "@/lib/admin/messages";

export function MessagesScreen({ conversations }: { conversations: ConversationAdmin[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display-serif text-2xl text-foreground">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversations récentes, toutes missions confondues — pour l&apos;arbitrage de litiges et le support.
        </p>
      </div>

      {conversations.length === 0 ? (
        <p className="rounded-2xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
          Aucune conversation pour l&apos;instant.
        </p>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Link
              key={c.missionId}
              href={`/admin/messages/${c.missionId}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex min-w-0 items-center gap-3">
                <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {c.recruteurNom} — {c.lieu}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{c.dernierMessage}</p>
                </div>
              </div>
              <div className="shrink-0 text-right text-xs text-muted-foreground">
                <p>{new Date(c.dernierMessageLe).toLocaleDateString("fr-FR")}</p>
                <p>{c.nbMessages} message{c.nbMessages > 1 ? "s" : ""}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
