"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MissionCardPrestataire } from "@/components/dashboard/mission-card-prestataire";
import type { LigneProposee } from "@/lib/missions";

const JOURS = ["L", "M", "M", "J", "V", "S", "D"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const COULEUR_STATUT: Record<string, string> = {
  en_attente: "bg-amber-500",
  acceptee: "bg-emerald-500",
  refusee: "bg-destructive",
};

export function CalendrierMissions({
  lignes,
  messagesNonLusParMission,
}: {
  lignes: LigneProposee[];
  messagesNonLusParMission: Record<string, number>;
}) {
  const aujourdhui = new Date();
  const [annee, setAnnee] = useState(aujourdhui.getFullYear());
  const [mois, setMois] = useState(aujourdhui.getMonth());
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(
    aujourdhui.toISOString().slice(0, 10),
  );

  const parJour = useMemo(() => {
    const map = new Map<string, LigneProposee[]>();
    for (const ligne of lignes) {
      const date = ligne.mission.date_mission;
      map.set(date, [...(map.get(date) ?? []), ligne]);
    }
    return map;
  }, [lignes]);

  const premierJourMois = new Date(annee, mois, 1);
  const decalage = (premierJourMois.getDay() + 6) % 7; // lundi = 0
  const joursDansMois = new Date(annee, mois + 1, 0).getDate();

  const cases: (number | null)[] = [
    ...Array(decalage).fill(null),
    ...Array.from({ length: joursDansMois }, (_, i) => i + 1),
  ];

  function dateStr(jour: number) {
    return `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
  }

  const missionsDuJour = jourSelectionne ? (parJour.get(jourSelectionne) ?? []) : [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Mois précédent"
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary"
            onClick={() => {
              const d = new Date(annee, mois - 1, 1);
              setAnnee(d.getFullYear());
              setMois(d.getMonth());
            }}
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="font-heading font-semibold text-foreground">
            {MOIS[mois]} {annee}
          </p>
          <button
            type="button"
            aria-label="Mois suivant"
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary"
            onClick={() => {
              const d = new Date(annee, mois + 1, 1);
              setAnnee(d.getFullYear());
              setMois(d.getMonth());
            }}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {JOURS.map((j, i) => (
            <div key={i}>{j}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cases.map((jour, i) => {
            if (jour === null) return <div key={i} />;
            const date = dateStr(jour);
            const missions = parJour.get(date) ?? [];
            const selectionne = jourSelectionne === date;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setJourSelectionne(date)}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-sm",
                  selectionne ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary",
                )}
              >
                {jour}
                {missions.length > 0 && (
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      selectionne ? "bg-primary-foreground" : COULEUR_STATUT[missions[0].statut_acceptation],
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {jourSelectionne && missionsDuJour.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Aucune mission ce jour-là.</p>
        )}
        {missionsDuJour.map((ligne) => (
          <MissionCardPrestataire
            key={ligne.id}
            ligne={ligne}
            messagesNonLus={messagesNonLusParMission[ligne.mission_id] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
