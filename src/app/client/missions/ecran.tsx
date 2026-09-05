"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/app/client/_components/stat-card";
import { FilterPill } from "@/app/client/_components/filter-pill";
import { Badge } from "@/app/client/_components/badge";
import { DashButton } from "@/app/client/_components/button";
import { AvatarPill } from "@/app/client/_components/avatar-pill";
import { dateCourteFr, BADGE_STATUT_MISSION } from "@/app/client/_lib";
import { classerMission, type MissionAvecEquipe } from "@/app/client/_types";

type Filtre = "toutes" | "en_cours" | "a_venir" | "terminees";

function actionsPourMission(m: MissionAvecEquipe) {
  const categorie = classerMission(m);
  if (categorie === "a_venir" && m.dernierMessageType === "devis") {
    return [{ label: "Examiner le devis", href: `/missions/${m.id}`, variant: "sombre" as const }];
  }
  if (categorie === "a_venir") {
    return [{ label: "Voir les candidatures", href: "/client/candidatures", variant: "secondaire" as const }];
  }
  if (categorie === "en_cours") {
    return m.paiement ? [{ label: "Facture", href: `/api/factures/${m.id}`, variant: "secondaire" as const }] : [];
  }
  if (categorie === "terminee") {
    return [
      { label: "Facture", href: `/api/factures/${m.id}`, variant: "secondaire" as const },
      { label: "Reproposer", href: `/tableau-de-bord/missions/${m.id}/refaire`, variant: "secondaire" as const },
    ];
  }
  return [{ label: "Détail", href: `/missions/${m.id}`, variant: "secondaire" as const }];
}

export function EcranMissions({ missions }: { missions: MissionAvecEquipe[] }) {
  const [filtre, setFiltre] = useState<Filtre>("toutes");

  const compteurs = useMemo(
    () => ({
      en_cours: missions.filter((m) => classerMission(m) === "en_cours").length,
      a_venir: missions.filter((m) => classerMission(m) === "a_venir").length,
      terminees: missions.filter((m) => classerMission(m) === "terminee").length,
    }),
    [missions],
  );

  const filtrees = missions.filter((m) => {
    if (filtre === "toutes") return true;
    return classerMission(m) === (filtre === "a_venir" ? "a_venir" : filtre === "en_cours" ? "en_cours" : "terminee");
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Vos missions
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B6660]">Toutes vos missions, du devis à la facture.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="En cours" valeur={compteurs.en_cours} />
        <StatCard label="À venir" valeur={compteurs.a_venir} />
        <StatCard label="Terminées" valeur={compteurs.terminees} />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill actif={filtre === "toutes"} onClick={() => setFiltre("toutes")}>Toutes</FilterPill>
        <FilterPill actif={filtre === "en_cours"} onClick={() => setFiltre("en_cours")}>En cours</FilterPill>
        <FilterPill actif={filtre === "a_venir"} onClick={() => setFiltre("a_venir")}>À venir</FilterPill>
        <FilterPill actif={filtre === "terminees"} onClick={() => setFiltre("terminees")}>Terminées</FilterPill>
      </div>

      {filtrees.length === 0 ? (
        <p className="py-10 text-center text-[13.5px] text-[#6B6660]">Aucune mission dans ce filtre.</p>
      ) : (
        <div className="space-y-2.5">
          {filtrees.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14.5px] font-semibold text-[#1A1917]">{m.lieu}</p>
                  <Badge tone={BADGE_STATUT_MISSION[m.statut].tone}>{BADGE_STATUT_MISSION[m.statut].label}</Badge>
                </div>
                <p className="mt-0.5 text-[12.5px] text-[#6B6660]">{dateCourteFr(m.date_mission)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {m.lignes.map((l) => (
                    <AvatarPill key={l.id} prenom={l.prenom || "?"} />
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="min-w-[104px] text-right text-[15px] text-[#1A1917]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
                  {m.montant_total} €
                </span>
                <div className="flex gap-2">
                  {actionsPourMission(m).map((a) => (
                    <Link key={a.label} href={a.href}>
                      <DashButton variant={a.variant}>{a.label}</DashButton>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
