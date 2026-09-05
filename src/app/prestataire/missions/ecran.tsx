"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatCard } from "@/app/prestataire/_components/stat-card";
import { FilterPill } from "@/app/prestataire/_components/filter-pill";
import { Badge } from "@/app/prestataire/_components/badge";
import { DashButton } from "@/app/prestataire/_components/button";
import { BADGE_STATUT_LIGNE, classerLigne, type LigneAvecMission } from "@/app/prestataire/_types";
import { dateCourteFr, heuresEntre } from "@/app/prestataire/_lib";
import { accepterMission, declinerMission } from "@/app/prestataire/actions";

const TONE_LIGNE: Record<string, "vert" | "orange" | "rouge" | "bleu" | "gris"> = {
  "À répondre": "orange",
  Acceptée: "bleu",
  Déclinée: "gris",
};

type Filtre = "toutes" | "a_repondre" | "confirmees" | "realisees";

export function EcranMissions({ lignes }: { lignes: LigneAvecMission[] }) {
  const router = useRouter();
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [enCours, startTransition] = useTransition();

  const compteurs = useMemo(
    () => ({
      a_venir: lignes.filter((l) => classerLigne(l) === "confirmee").length,
      a_repondre: lignes.filter((l) => classerLigne(l) === "a_repondre").length,
      realisees: lignes.filter((l) => classerLigne(l) === "realisee").length,
    }),
    [lignes],
  );

  const filtrees = lignes.filter((l) => {
    const cat = classerLigne(l);
    if (filtre === "toutes") return true;
    if (filtre === "a_repondre") return cat === "a_repondre";
    if (filtre === "confirmees") return cat === "confirmee";
    return cat === "realisee";
  });

  function repondre(ligneId: string, accepter: boolean) {
    startTransition(async () => {
      await (accepter ? accepterMission(ligneId) : declinerMission(ligneId));
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Vos missions
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B6660]">Le montant affiché est toujours le net, après commission.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="À venir" valeur={compteurs.a_venir} />
        <StatCard label="À répondre" valeur={compteurs.a_repondre} />
        <StatCard label="Réalisées" valeur={compteurs.realisees} />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill actif={filtre === "toutes"} onClick={() => setFiltre("toutes")}>Toutes</FilterPill>
        <FilterPill actif={filtre === "a_repondre"} onClick={() => setFiltre("a_repondre")}>À répondre</FilterPill>
        <FilterPill actif={filtre === "confirmees"} onClick={() => setFiltre("confirmees")}>Confirmées</FilterPill>
        <FilterPill actif={filtre === "realisees"} onClick={() => setFiltre("realisees")}>Réalisées</FilterPill>
      </div>

      {filtrees.length === 0 ? (
        <p className="py-10 text-center text-[13.5px] text-[#6B6660]">Aucune mission dans ce filtre.</p>
      ) : (
        <div className="space-y-2.5">
          {filtrees.map((l) => {
            const cat = classerLigne(l);
            const badge = BADGE_STATUT_LIGNE[l.statut_acceptation];
            const heures = heuresEntre(l.heure_debut, l.heure_fin);
            return (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14.5px] font-semibold text-[#1A1917]">{l.mission.lieu}</p>
                    <Badge tone={TONE_LIGNE[badge] ?? "gris"}>{badge}</Badge>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-[#6B6660]">
                    {dateCourteFr(l.mission.date_mission)} · {l.heure_debut.slice(0, 5)} → {l.heure_fin.slice(0, 5)} · {heures}h
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[15px] text-[#1A1917]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
                    {l.tarif_applique} € <span className="text-[11px] font-sans" style={{ color: "#98938B" }}>net</span>
                  </span>
                  {cat === "a_repondre" ? (
                    <div className="flex gap-2">
                      <DashButton variant="plein" disabled={enCours} onClick={() => repondre(l.id, true)}>
                        Accepter
                      </DashButton>
                      <DashButton variant="secondaire" disabled={enCours} onClick={() => repondre(l.id, false)}>
                        Décliner
                      </DashButton>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Link href={`/missions/${l.mission_id}`}>
                        <DashButton variant="secondaire">Détail</DashButton>
                      </Link>
                      <Link href={`/missions/${l.mission_id}`}>
                        <DashButton variant="secondaire">Messagerie</DashButton>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
