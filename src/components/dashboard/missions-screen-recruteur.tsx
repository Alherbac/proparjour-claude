"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MissionCardRecruteur } from "@/components/dashboard/mission-card-recruteur";
import type { MissionAvecLignes } from "@/lib/missions";

const GROUPES = [
  { cle: "en_attente", label: "En attente" },
  { cle: "confirmees", label: "Confirmées" },
  { cle: "terminees", label: "Terminées" },
] as const;

function groupe(mission: MissionAvecLignes): (typeof GROUPES)[number]["cle"] {
  if (mission.statut === "en_attente") return "en_attente";
  if (mission.statut === "confirmee" || mission.statut === "en_cours") return "confirmees";
  return "terminees";
}

export function MissionsScreenRecruteur({
  missions,
  messagesNonLusParMission,
}: {
  missions: MissionAvecLignes[];
  messagesNonLusParMission: Record<string, number>;
}) {
  const [ongletActif, setOngletActif] = useState<(typeof GROUPES)[number]["cle"]>("en_attente");

  const parGroupe = GROUPES.map((g) => ({
    ...g,
    missions: missions.filter((m) => groupe(m) === g.cle),
  }));

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Mes missions</h1>

      <div className="flex gap-2 overflow-x-auto">
        {parGroupe.map((g) => (
          <button
            key={g.cle}
            type="button"
            aria-pressed={ongletActif === g.cle}
            onClick={() => setOngletActif(g.cle)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium",
              ongletActif === g.cle
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {g.label} {g.missions.length > 0 && `(${g.missions.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {parGroupe
          .find((g) => g.cle === ongletActif)!
          .missions.map((mission) => (
            <MissionCardRecruteur
              key={mission.id}
              mission={mission}
              messagesNonLus={messagesNonLusParMission[mission.id] ?? 0}
            />
          ))}
        {parGroupe.find((g) => g.cle === ongletActif)!.missions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Rien ici pour l&apos;instant.</p>
        )}
      </div>
    </div>
  );
}
