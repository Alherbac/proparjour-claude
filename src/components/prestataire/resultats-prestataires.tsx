import { PrestataireResultCard } from "@/components/prestataire/prestataire-result-card";
import type { PrestatairesPublicsRow } from "@/lib/supabase/database.types";

export function ResultatsPrestataires({
  resultats,
  enMissionIds,
}: {
  resultats: PrestatairesPublicsRow[];
  enMissionIds: string[];
}) {
  const enMission = new Set(enMissionIds);

  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {resultats.map((prestataire) => (
        <PrestataireResultCard
          key={prestataire.id}
          prestataire={prestataire}
          enMission={enMission.has(prestataire.id)}
        />
      ))}
    </div>
  );
}
