import { PrestataireResultCard } from "@/components/prestataire/prestataire-result-card";
import type { PrestatairesPublicsRow } from "@/lib/supabase/database.types";

export function ResultatsPrestataires({
  resultats,
  enMissionIds,
  missionsTerminees = [],
  avis = [],
}: {
  resultats: PrestatairesPublicsRow[];
  enMissionIds: string[];
  missionsTerminees?: [string, number][];
  avis?: [string, { noteMoyenne: number; nbAvis: number }][];
}) {
  const enMission = new Set(enMissionIds);
  const missionsTermineesParId = new Map(missionsTerminees);
  const avisParId = new Map(avis);

  return (
    <div
      className="mt-8 grid items-stretch gap-[16px]"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))" }}
    >
      {resultats.map((prestataire) => (
        <PrestataireResultCard
          key={prestataire.id}
          prestataire={prestataire}
          enMission={enMission.has(prestataire.id)}
          missionsTerminees={missionsTermineesParId.get(prestataire.id) ?? 0}
          avis={avisParId.get(prestataire.id) ?? null}
        />
      ))}
    </div>
  );
}
