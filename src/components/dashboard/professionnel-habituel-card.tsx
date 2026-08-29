import Link from "next/link";
import { MapPin, BadgeCheck } from "lucide-react";
import { METIERS } from "@/config/metiers";
import { FavoriButton } from "@/components/prestataire/favori-button";
import { cn } from "@/lib/utils";
import type { ProfessionnelHistorique } from "@/lib/professionnels-habituels";

function formatDateFr(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function ProfessionnelHabituelCard({ professionnel }: { professionnel: ProfessionnelHistorique }) {
  const metier = professionnel.metier ? METIERS.find((m) => m.id === professionnel.metier) : undefined;
  const nom = [professionnel.prenom, professionnel.nom?.charAt(0)].filter(Boolean).join(" ");

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4">
      <Link href={`/prestataires/${professionnel.prestataireId}`} className="shrink-0">
        {professionnel.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
          <img src={professionnel.photoUrl} alt={nom} className="size-12 rounded-full object-cover" />
        ) : (
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-foreground/70",
              metier?.accent.gradient,
            )}
          >
            {(professionnel.prenom ?? "P").charAt(0)}
          </div>
        )}
      </Link>

      <Link href={`/prestataires/${professionnel.prestataireId}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium text-foreground">{nom || "Prestataire"}</p>
          {professionnel.statutVerification === "valide" && (
            <BadgeCheck className="size-3.5 shrink-0 text-blue-500" />
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">{metier?.label}</p>
        <p className="mt-0.5 flex items-center gap-x-3 text-xs text-muted-foreground">
          <span>
            {professionnel.nbMissions} mission{professionnel.nbMissions > 1 ? "s" : ""} ensemble
          </span>
          {professionnel.ville && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {professionnel.ville}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">Dernière mission le {formatDateFr(professionnel.derniereMission)}</p>
      </Link>

      <FavoriButton prestataireId={professionnel.prestataireId} className="static shrink-0 bg-transparent shadow-none" />
    </div>
  );
}
