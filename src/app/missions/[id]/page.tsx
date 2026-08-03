import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getParticipantsMission, getMessagesEntre } from "@/lib/messages";
import { MessageThread } from "@/components/missions/message-thread";

export const metadata: Metadata = {
  title: "Messages de la mission — ProParJour",
};

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/connexion?next=/missions/${id}`);
  }

  const participants = await getParticipantsMission(id);
  if (!participants) notFound();

  const estRecruteur = participants.recruteur.userId === user.id;
  const estPrestataire = participants.prestataires.some((p) => p.userId === user.id);
  if (!estRecruteur && !estPrestataire) notFound();

  const contacts = estRecruteur
    ? participants.prestataires
    : [participants.recruteur];

  const threads = await Promise.all(
    contacts.map(async (contact) => ({
      autreId: contact.userId,
      autreNom: `${contact.prenom ?? ""} ${contact.nom ?? ""}`.trim() || "Utilisateur ProParJour",
      messages: await getMessagesEntre(id, user.id, contact.userId),
    })),
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 lg:px-8">
      <Link
        href="/tableau-de-bord"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Retour au tableau de bord
      </Link>
      <h1 className="mt-4 font-heading text-2xl font-semibold text-foreground">
        Messages de la mission
      </h1>

      <div className="mt-6 space-y-6">
        {threads.map((thread) => (
          <MessageThread
            key={thread.autreId}
            missionId={id}
            moiId={user.id}
            autreId={thread.autreId}
            autreNom={thread.autreNom}
            messagesInitiaux={thread.messages}
          />
        ))}
      </div>
    </div>
  );
}
