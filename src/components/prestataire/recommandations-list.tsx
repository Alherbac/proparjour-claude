import { AlertTriangle } from "lucide-react";
import { RecommandationCard } from "@/components/prestataire/recommandation-card";
import type { Recommandation } from "@/lib/matching";

export function RecommandationsList({
  recommandations,
  suffisant,
  quantite,
  enMissionIds,
}: {
  recommandations: Recommandation[];
  suffisant: boolean;
  quantite: number;
  enMissionIds: string[];
}) {
  const enMission = new Set(enMissionIds);
  const postes = quantite > 1 ? `${quantite} postes demandés` : `${quantite} poste demandé`;
  const messageInsuffisant = `Nous n'avons pas assez de profils excellents pour couvrir les ${postes} pour ce besoin — voici les meilleurs professionnels disponibles. Publier une offre ouverte peut aussi permettre à d'autres professionnels de candidater directement.`;

  if (recommandations.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        Aucun professionnel de ce métier n&apos;est encore inscrit sur ProParJour pour l&apos;instant.
      </div>
    );
  }

  return (
    <div className="mt-8">
      {!suffisant && (
        <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{messageInsuffisant}</p>
        </div>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {recommandations.map((recommandation) => (
          <RecommandationCard
            key={recommandation.prestataire.id}
            recommandation={recommandation}
            enMission={enMission.has(recommandation.prestataire.id)}
          />
        ))}
      </div>
    </div>
  );
}
