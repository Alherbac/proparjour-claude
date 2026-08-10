import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getConversationsUtilisateur } from "@/lib/messages";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Messages — ProParJour" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default async function MessagerieePage() {
  const conversations = await getConversationsUtilisateur();

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Messages</h1>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background py-14 text-center">
          <MessageCircle className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Vos conversations de mission apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
          {conversations.map((conv) => (
            <Link
              key={conv.missionId}
              href={`/missions/${conv.missionId}`}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/50"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {conv.autreNom.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{conv.autreNom}</p>
                  {conv.dernierMessageAt && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(conv.dernierMessageAt)}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {conv.dernierMessage ?? `Mission — ${conv.lieu}`}
                </p>
              </div>
              {conv.nonLus > 0 && (
                <Badge className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {conv.nonLus}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
