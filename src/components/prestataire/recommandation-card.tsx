import { PrestataireResultCard } from "@/components/prestataire/prestataire-result-card";
import { IconeCritere, classeTexteCritere } from "@/components/prestataire/critere-etat";
import { cn } from "@/lib/utils";
import type { Recommandation } from "@/lib/matching";

const NIVEAU_INFO: Record<Recommandation["niveau"], { label: string; classe: string }> = {
  excellent: { label: "Excellent match", classe: "bg-emerald-500 text-white" },
  bon: { label: "Bon match", classe: "bg-blue-500 text-white" },
  partiel: { label: "Correspondance partielle", classe: "bg-amber-500 text-white" },
};

export function RecommandationCard({ recommandation, enMission }: { recommandation: Recommandation; enMission: boolean }) {
  const { prestataire, score, niveau, criteres } = recommandation;
  const info = NIVEAU_INFO[niveau];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <PrestataireResultCard prestataire={prestataire} enMission={enMission} />
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", info.classe)}>
            {score}% — {info.label}
          </span>
        </div>
        <ul className="mt-2.5 space-y-1">
          {criteres.map((critere) => (
            <li key={critere.cle} className={cn("flex items-center gap-1.5 text-xs text-foreground", classeTexteCritere(critere.etat))}>
              <IconeCritere
                etat={critere.etat}
                className={cn(
                  "size-3.5 shrink-0",
                  critere.etat === "correspond" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60",
                )}
              />
              {critere.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
