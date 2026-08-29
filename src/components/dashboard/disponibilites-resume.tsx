import Link from "next/link";
import { JOURS_SEMAINE } from "@/config/jours-semaine";
import { cn } from "@/lib/utils";

export function DisponibilitesResume({ disponibilites }: { disponibilites: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">Vos disponibilités</h2>
        <Link
          href="/tableau-de-bord/compte#disponibilites"
          className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Modifier
        </Link>
      </div>
      {disponibilites.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Vous n&apos;avez indiqué aucune disponibilité — vous n&apos;apparaîtrez dans aucune recommandation. Renseignez-les
          pour recevoir des missions.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {JOURS_SEMAINE.map((jour) => {
            const dispo = disponibilites.includes(jour);
            return (
              <span
                key={jour}
                className={cn(
                  "flex size-11 flex-col items-center justify-center rounded-xl border text-xs font-medium",
                  dispo
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "border-border bg-secondary/30 text-muted-foreground",
                )}
              >
                {jour}
                <span>{dispo ? "✓" : "—"}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
