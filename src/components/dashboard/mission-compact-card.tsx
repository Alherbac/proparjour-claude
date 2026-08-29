import Link from "next/link";
import { MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { METIERS } from "@/config/metiers";
import { montantMission } from "@/lib/duree";
import { cn } from "@/lib/utils";
import type { MissionRecommandee } from "@/lib/matching";
import type { CandidatureStatutType } from "@/lib/supabase/database.types";

const CANDIDATURE_LABEL: Record<CandidatureStatutType, string> = {
  en_attente: "Envoyée",
  acceptee: "Acceptée",
  refusee: "Refusée",
};

export function MissionCompactCard({
  recommandation,
  statutCandidature,
}: {
  recommandation: MissionRecommandee;
  statutCandidature?: CandidatureStatutType;
}) {
  const { offre, score, criteres } = recommandation;
  const metier = METIERS.find((m) => m.id === offre.metier);
  const total = montantMission(offre.heure_debut, offre.heure_fin, offre.tarif_horaire);
  const raisons = criteres.filter((c) => c.etat === "correspond").slice(0, 2);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 sm:flex-row sm:items-center">
      <div className={cn("flex size-12 shrink-0 flex-col items-center justify-center rounded-xl", metier?.accent.bgSoft)}>
        <span className={cn("font-heading text-base font-semibold leading-none", metier?.accent.text)}>{score}</span>
        <span className={cn("text-[9px] font-medium leading-none", metier?.accent.text)}>%</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{offre.titre}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3" />
            {offre.ville}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3" />
            {offre.date_mission}
          </span>
          <span className="font-medium text-foreground">{total} €</span>
        </div>
        {raisons.length > 0 && (
          <p className={cn("mt-1 truncate text-xs", metier?.accent.text)}>{raisons.map((r) => r.label).join(" · ")}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {statutCandidature && (
          <span className="text-xs font-medium text-muted-foreground">{CANDIDATURE_LABEL[statutCandidature]}</span>
        )}
        <Button render={<Link href={`/tableau-de-bord/offres/${offre.id}`} />} size="sm" variant="outline" className="rounded-full">
          Voir
        </Button>
      </div>
    </div>
  );
}
