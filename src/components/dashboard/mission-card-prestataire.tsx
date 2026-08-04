import Link from "next/link";
import { CalendarDays, MapPin, MessageCircle } from "lucide-react";
import { ReponseMissionButtons } from "@/components/missions/reponse-mission-buttons";
import { DeclarerServiceFaitButton } from "@/components/missions/declarer-service-fait-button";
import { cn } from "@/lib/utils";
import type { LigneProposee } from "@/lib/missions";

const STATUT_BADGE: Record<string, { label: string; style: string }> = {
  en_attente: { label: "🟠 À répondre", style: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  refusee: { label: "🔴 Refusée", style: "bg-destructive/10 text-destructive" },
  confirmee: { label: "🟢 Confirmée", style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  declaree: { label: "🟢 Service déclaré", style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  terminee: { label: "✅ Terminée", style: "bg-secondary text-secondary-foreground" },
  annulee: { label: "🔴 Annulée", style: "bg-destructive/10 text-destructive" },
  litige: { label: "⚠️ Litige", style: "bg-destructive/10 text-destructive" },
};

function statutCarte(ligne: LigneProposee): keyof typeof STATUT_BADGE {
  if (ligne.mission.statut === "annulee") return "annulee";
  if (ligne.mission.statut === "litige") return "litige";
  if (ligne.mission.statut === "terminee") return "terminee";
  if (ligne.statut_acceptation === "refusee") return "refusee";
  if (ligne.statut_acceptation === "en_attente") return "en_attente";
  if (ligne.service_fait) return "declaree";
  return "confirmee";
}

export function MissionCardPrestataire({
  ligne,
  messagesNonLus = 0,
}: {
  ligne: LigneProposee;
  messagesNonLus?: number;
}) {
  const cle = statutCarte(ligne);
  const badge = STATUT_BADGE[cle];
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const peutDeclarer =
    ligne.statut_acceptation === "acceptee" &&
    !ligne.service_fait &&
    (ligne.mission.statut === "confirmee" || ligne.mission.statut === "en_cours") &&
    ligne.mission.date_mission <= aujourdhui;

  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarDays className="size-4 text-muted-foreground" />
          {ligne.mission.date_mission}
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-medium", badge.style)}>
          {badge.label}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="size-4" />
        {ligne.mission.lieu}
      </div>

      <div className="mt-1 text-sm text-muted-foreground">
        {ligne.heure_debut}–{ligne.heure_fin} · {ligne.tarif_applique} €
      </div>

      {ligne.mission.statut === "litige" && ligne.mission.motif_litige && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {ligne.mission.motif_litige}
        </p>
      )}

      {ligne.mission.statut === "terminee" && (
        <p className="mt-3 text-sm text-muted-foreground">
          Le client a confirmé le service. Votre paiement a été débloqué.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <Link
          href={`/missions/${ligne.mission_id}`}
          className="relative inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <MessageCircle className="size-3.5" />
          Message
          {messagesNonLus > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {messagesNonLus > 9 ? "9+" : messagesNonLus}
            </span>
          )}
        </Link>

        {ligne.statut_acceptation === "en_attente" && <ReponseMissionButtons ligneId={ligne.id} />}
        {peutDeclarer && <DeclarerServiceFaitButton ligneId={ligne.id} />}
      </div>
    </div>
  );
}
