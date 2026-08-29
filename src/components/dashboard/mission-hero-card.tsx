import Link from "next/link";
import { MapPin, CalendarDays, Clock, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { METIERS } from "@/config/metiers";
import { montantMission } from "@/lib/duree";
import { IconeCritere, classeTexteCritere } from "@/components/prestataire/critere-etat";
import { cn } from "@/lib/utils";
import type { MissionRecommandee } from "@/lib/matching";
import type { CandidatureStatutType } from "@/lib/supabase/database.types";

const NIVEAU_LABEL: Record<MissionRecommandee["niveau"], string> = {
  excellent: "Excellent match",
  bon: "Bon match",
  partiel: "Correspondance partielle",
};

const CANDIDATURE_LABEL: Record<CandidatureStatutType, string> = {
  en_attente: "Candidature envoyée",
  acceptee: "Candidature acceptée",
  refusee: "Candidature refusée",
};

export function MissionHeroCard({
  recommandation,
  statutCandidature,
}: {
  recommandation: MissionRecommandee;
  statutCandidature?: CandidatureStatutType;
}) {
  const { offre, score, niveau, criteres } = recommandation;
  const metier = METIERS.find((m) => m.id === offre.metier);
  const total = montantMission(offre.heure_debut, offre.heure_fin, offre.tarif_horaire);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] border bg-gradient-to-br p-6 sm:p-7",
        metier?.accent.border ?? "border-primary/20",
        metier?.accent.gradient ?? "from-primary/10 via-transparent to-transparent",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className={cn("font-mono-landing text-xs font-medium uppercase tracking-[0.12em]", metier?.accent.text)}>
            ★ Meilleure opportunité · {metier?.filiere}
          </p>
          <p className="mt-2 font-display-serif text-2xl leading-tight text-foreground sm:text-[26px]">
            {offre.titre}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className={cn("font-heading text-5xl font-semibold leading-none", metier?.accent.text)}>{score}%</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{NIVEAU_LABEL[niveau]}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-foreground/80">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-3.5" />
          {offre.ville}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          {offre.date_mission}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {offre.heure_debut}–{offre.heure_fin}
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <Euro className="size-3.5" />
          {total} € estimés ({offre.tarif_horaire} €/h)
        </span>
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {criteres.map((critere) => (
          <li key={critere.cle} className={cn("flex items-center gap-1.5 text-sm text-foreground", classeTexteCritere(critere.etat))}>
            <IconeCritere
              etat={critere.etat}
              className={cn("size-4 shrink-0", critere.etat === "correspond" ? (metier?.accent.text ?? "text-emerald-600") : "text-muted-foreground/50")}
            />
            {critere.label}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          render={<Link href={`/tableau-de-bord/offres/${offre.id}`} />}
          className={cn("rounded-full border-0 text-white hover:opacity-90", metier?.accent.bg ?? "bg-primary")}
        >
          {statutCandidature ? "Voir ma candidature" : "Voir la mission"}
        </Button>
        {statutCandidature && (
          <span className="text-sm text-muted-foreground">{CANDIDATURE_LABEL[statutCandidature]}</span>
        )}
      </div>
    </div>
  );
}
