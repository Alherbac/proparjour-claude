"use client";

import Link from "next/link";
import { Badge } from "@/app/prestataire/_components/badge";
import { DashButton } from "@/app/prestataire/_components/button";
import { dateCourteFr } from "@/app/prestataire/_lib";
import { BADGE_STATUT_CANDIDATURE, type CandidatureEnvoyee } from "@/app/prestataire/_types";

const TONE_CANDIDATURE: Record<string, "vert" | "orange" | "rouge" | "bleu" | "gris"> = {
  Envoyée: "orange",
  "En discussion": "bleu",
  Retenue: "vert",
  "Non retenue": "gris",
};

/**
 * "Mes candidatures" — migré depuis l'ancien /tableau-de-bord/candidatures.
 * Même source de données que le compteur "Candidatures envoyées"
 * d'Opportunités (getCandidaturesEnvoyees), jamais une seconde requête
 * qui pourrait diverger.
 */
export function EcranCandidatures({ candidatures }: { candidatures: CandidatureEnvoyee[] }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Mes candidatures
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B6660]">Suivez l&apos;avancement de vos candidatures aux missions.</p>
      </div>

      {candidatures.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-[#DDD8D1] py-16 text-center">
          <p className="text-[13.5px] text-[#6B6660]">Vous n&apos;avez pas encore candidaté à une mission.</p>
          <Link href="/prestataire/opportunites">
            <DashButton variant="secondaire">Explorer les missions</DashButton>
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {candidatures.map((c) => {
            const badge = BADGE_STATUT_CANDIDATURE[c.statut];
            return (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14.5px] font-semibold text-[#1A1917]">{c.offre.titre}</p>
                    <Badge tone={TONE_CANDIDATURE[badge] ?? "gris"}>{badge}</Badge>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-[#6B6660]">
                    {c.offre.ville} · {dateCourteFr(c.offre.date_mission)}
                  </p>
                </div>
                <Link href={`/prestataire/opportunites/${c.offre.id}`}>
                  <DashButton variant="secondaire">Voir la mission</DashButton>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
