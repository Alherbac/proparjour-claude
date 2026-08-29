import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminSession } from "@/lib/admin/auth";
import { getThreadAdmin } from "@/lib/admin/messages";

export const metadata: Metadata = { title: "Conversation — Admin ProParJour" };

export default async function AdminMessageThreadPage({
  params,
}: {
  params: Promise<{ missionId: string }>;
}) {
  await requireAdminSession();
  const { missionId } = await params;
  const thread = await getThreadAdmin(missionId);
  if (!thread) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/admin/messages" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Retour aux conversations
      </Link>

      <div>
        <h1 className="font-display-serif text-2xl text-foreground">{thread.mission.lieu}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{thread.mission.dateMission} — lecture seule</p>
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-background p-4">
        {thread.messages.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun message pour cette mission.</p>
        )}
        {thread.messages.map((m) => (
          <div key={m.id} className="rounded-xl border border-border/60 p-3 text-sm">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{m.expediteurNom}</span>
              <span>{new Date(m.created_at).toLocaleString("fr-FR")}</span>
            </div>
            <p className="mt-1 text-foreground">{m.contenu}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
