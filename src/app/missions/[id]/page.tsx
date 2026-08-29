import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getParticipantsMission, getMessagesEntre } from "@/lib/messages";
import { getStatutPaiementMission } from "@/lib/missions";
import { MessageThread } from "@/components/missions/message-thread";
import { DeclarerServiceFaitButton } from "@/components/missions/declarer-service-fait-button";
import { ConfirmerOuContester } from "@/components/missions/confirmer-ou-contester";
import { AnnulerMissionButton } from "@/components/missions/annuler-mission-button";
import { AvisForm } from "@/components/missions/avis-form";

export const metadata: Metadata = {
  title: "Messages de la mission — ProParJour",
};

const STATUT_LABEL: Record<string, string> = {
  en_attente: "🟡 En attente de paiement",
  confirmee: "🟢 Mission confirmée",
  en_cours: "🔵 Mission en cours",
  terminee: "✅ Mission réalisée",
  annulee: "❌ Mission annulée",
  litige: "⚠️ Mission en litige",
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

  const [{ data: mission }, paiementStatut] = await Promise.all([
    supabase.from("missions").select("*").eq("id", id).maybeSingle(),
    getStatutPaiementMission(id),
  ]);
  if (!mission) notFound();

  let maLigne: { id: string; statut_acceptation: string; service_fait: boolean } | null = null;
  if (estPrestataire) {
    const { data: profil } = await supabase.from("prestataires_profils").select("id").eq("user_id", user.id).maybeSingle();
    if (profil) {
      const { data: ligne } = await supabase
        .from("mission_lignes")
        .select("id, statut_acceptation, service_fait")
        .eq("mission_id", id)
        .eq("prestataire_id", profil.id)
        .maybeSingle();
      maLigne = ligne ?? null;
    }
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const missionActive = mission.statut === "confirmee" || mission.statut === "en_cours";
  const peutDeclarerServiceFait =
    estPrestataire && maLigne && maLigne.statut_acceptation === "acceptee" && !maLigne.service_fait && missionActive && mission.date_mission <= aujourdhui;
  const peutFacturer = estRecruteur && paiementStatut !== null && paiementStatut !== "en_attente" && paiementStatut !== "echec";

  const contacts = estRecruteur
    ? participants.prestataires
    : [participants.recruteur];

  // Ligne de mission par contact — nécessaire pour attacher un avis
  // (table `avis`, clé sur mission_ligne_id) à la bonne personne :
  // le recruteur note chaque prestataire séparément (une ligne
  // chacun), le prestataire note le recruteur sur sa propre ligne.
  let ligneIdParContact = new Map<string, string>();
  if (estRecruteur) {
    const { data: lignes } = await supabase
      .from("mission_lignes")
      .select("id, prestataire_id")
      .eq("mission_id", id);
    const prestataireIds = [...new Set((lignes ?? []).map((l) => l.prestataire_id))];
    const { data: profils } =
      prestataireIds.length > 0
        ? await supabase.from("prestataires_profils").select("id, user_id").in("id", prestataireIds)
        : { data: [] as { id: string; user_id: string }[] };
    const userIdParProfilId = new Map((profils ?? []).map((p) => [p.id, p.user_id]));
    ligneIdParContact = new Map(
      (lignes ?? [])
        .map((l) => [userIdParProfilId.get(l.prestataire_id), l.id] as const)
        .filter((entry): entry is [string, string] => Boolean(entry[0])),
    );
  } else if (maLigne) {
    ligneIdParContact = new Map([[participants.recruteur.userId, maLigne.id]]);
  }

  const missionTerminee = mission.statut === "terminee";
  const ligneIdsAvis = [...ligneIdParContact.values()];
  const { data: avisExistants } =
    missionTerminee && ligneIdsAvis.length > 0
      ? await supabase.from("avis").select("mission_ligne_id").eq("auteur_id", user.id).in("mission_ligne_id", ligneIdsAvis)
      : { data: [] as { mission_ligne_id: string }[] };
  const ligneIdsDejaNotees = new Set((avisExistants ?? []).map((a) => a.mission_ligne_id));

  const threads = await Promise.all(
    contacts.map(async (contact) => ({
      autreId: contact.userId,
      autreNom: `${contact.prenom ?? ""} ${contact.nom ?? ""}`.trim() || "Utilisateur ProParJour",
      messages: await getMessagesEntre(id, user.id, contact.userId),
      ligneId: ligneIdParContact.get(contact.userId) ?? null,
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
      <h1 className="mt-4 font-display-serif text-2xl text-foreground">
        Messages de la mission
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {mission.lieu} — {mission.date_mission}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/30 px-4 py-3">
        <span className="text-sm font-medium text-foreground">{STATUT_LABEL[mission.statut] ?? mission.statut}</span>
        <div className="flex flex-wrap items-center gap-2">
          {peutFacturer && (
            <Link
              href={`/api/factures/${id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40"
            >
              <FileText className="size-3.5" />
              Voir la facture
            </Link>
          )}
          {peutDeclarerServiceFait && maLigne && <DeclarerServiceFaitButton ligneId={maLigne.id} />}
          {estRecruteur && missionActive && (
            <>
              <ConfirmerOuContester missionId={id} />
              <AnnulerMissionButton missionId={id} />
            </>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {threads.map((thread) => (
          <div key={thread.autreId} className="space-y-3">
            <MessageThread
              missionId={id}
              moiId={user.id}
              autreId={thread.autreId}
              autreNom={thread.autreNom}
              messagesInitiaux={thread.messages}
              estRecruteur={estRecruteur}
              paiementStatut={paiementStatut}
            />
            {missionTerminee && thread.ligneId && (
              ligneIdsDejaNotees.has(thread.ligneId) ? (
                <p className="text-xs text-muted-foreground">Vous avez déjà laissé un avis à {thread.autreNom}.</p>
              ) : (
                <AvisForm missionLigneId={thread.ligneId} autreNom={thread.autreNom} />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
