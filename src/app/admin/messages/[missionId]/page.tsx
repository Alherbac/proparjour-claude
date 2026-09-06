import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminSession } from "@/lib/admin/auth";
import { getThreadAdmin } from "@/lib/admin/messages";
import { AdminH1 } from "@/components/admin/ui/section";

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
      <Link
        href="/admin/messages"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--a-text-2)] transition-colors hover:text-[var(--a-ink)]"
      >
        <ArrowLeft className="size-3.5" />
        Retour aux conversations
      </Link>

      <div>
        <AdminH1>{thread.mission.lieu}</AdminH1>
        <p className="mt-1 text-[13px] text-[var(--a-text-2)]">{thread.mission.dateMission} — lecture seule</p>
      </div>

      <div className="space-y-2 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
        {thread.messages.length === 0 && (
          <p className="text-[13px] text-[var(--a-text-3)]">Aucun message pour cette mission.</p>
        )}
        {thread.messages.map((m) => (
          <div key={m.id} className="rounded-[11px] border border-[var(--a-border)] p-3 text-[13px]">
            <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--a-text-2)]">
              <span className="font-semibold text-[var(--a-ink)]">{m.expediteurNom}</span>
              <span>{new Date(m.created_at).toLocaleString("fr-FR")}</span>
            </div>
            <p className="mt-1 text-[var(--a-ink)]">{m.contenu}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
