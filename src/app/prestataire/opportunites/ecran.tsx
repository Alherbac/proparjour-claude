"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/app/prestataire/_components/stat-card";
import { FilterPill } from "@/app/prestataire/_components/filter-pill";
import { Badge } from "@/app/prestataire/_components/badge";
import { DashButton } from "@/app/prestataire/_components/button";
import { dateCourteFr, correspondDisponibilite, heuresEntre } from "@/app/prestataire/_lib";
import type { OffresRow } from "@/lib/supabase/database.types";

type Filtre = "toutes" | "metier_dispo" | "metier";

export function EcranOpportunites({
  offres,
  idsCandidates,
  disponibilitesHebdo,
  exceptions,
  candidaturesEnvoyees,
  tauxReponse,
}: {
  offres: OffresRow[];
  idsCandidates: Set<string>;
  disponibilitesHebdo: string[];
  exceptions: { date: string; disponible: boolean }[];
  candidaturesEnvoyees: number;
  tauxReponse: number | null;
}) {
  const [filtre, setFiltre] = useState<Filtre>("toutes");

  const avecCorrespondance = useMemo(
    () => offres.map((o) => ({ offre: o, correspond: correspondDisponibilite(o.date_mission, disponibilitesHebdo, exceptions) })),
    [offres, disponibilitesHebdo, exceptions],
  );
  const correspondances = avecCorrespondance.length;

  const filtrees = avecCorrespondance.filter((x) => {
    if (filtre === "metier_dispo") return x.correspond;
    if (filtre === "metier") return !x.correspond;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Opportunités
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B6660]">Les offres correspondant à votre métier et vos disponibilités déclarées.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Correspondances" valeur={correspondances} />
        <StatCard label="Candidatures envoyées" valeur={candidaturesEnvoyees} />
        <StatCard label="Taux de réponse" valeur={tauxReponse === null ? "—" : `${tauxReponse} %`} />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill actif={filtre === "toutes"} onClick={() => setFiltre("toutes")}>Toutes</FilterPill>
        <FilterPill actif={filtre === "metier_dispo"} onClick={() => setFiltre("metier_dispo")}>Métier + dispo.</FilterPill>
        <FilterPill actif={filtre === "metier"} onClick={() => setFiltre("metier")}>Métier</FilterPill>
      </div>

      {filtrees.length === 0 ? (
        <p className="py-10 text-center text-[13.5px] text-[#6B6660]">Aucune offre dans ce filtre.</p>
      ) : (
        <div className="space-y-2.5">
          {filtrees.map(({ offre, correspond }) => {
            const heures = heuresEntre(offre.heure_debut, offre.heure_fin);
            const remuneration = Math.round(heures * offre.tarif_horaire * 100) / 100;
            const dejaCandidate = idsCandidates.has(offre.id);
            return (
              <div key={offre.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14.5px] font-semibold text-[#1A1917]">{offre.titre}</p>
                    <Badge tone={correspond ? "vert" : "gris"}>{correspond ? "Métier + dispo." : "Métier"}</Badge>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-[#6B6660]">
                    {dateCourteFr(offre.date_mission)} · {offre.heure_debut.slice(0, 5)} → {offre.heure_fin.slice(0, 5)} · {offre.ville}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[15px] text-[#1A1917]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
                    {remuneration} €
                  </span>
                  <Link href={`/tableau-de-bord/offres/${offre.id}`}>
                    <DashButton variant={dejaCandidate ? "secondaire" : "plein"} disabled={dejaCandidate}>
                      {dejaCandidate ? "Déjà candidaté" : "Candidater"}
                    </DashButton>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[12.5px] text-[#6B6660]">Une offre publiée sans rémunération est signalée à la plateforme et retirée de la recherche.</p>
    </div>
  );
}
