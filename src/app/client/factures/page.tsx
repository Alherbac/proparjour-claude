import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { StatCard } from "@/app/client/_components/stat-card";
import { Badge } from "@/app/client/_components/badge";
import { DashButton } from "@/app/client/_components/button";
import { getSessionClient, getMissionsClient } from "@/app/client/_data";
import { referenceMissionClient, dateCourteFr, BADGE_STATUT_FACTURE } from "@/app/client/_lib";

export const metadata: Metadata = { title: "Factures — ProParJour" };

const STATUTS_FACTURABLES = new Set(["sequestre", "libere", "rembourse"]);

export default async function PageFactures() {
  const session = await getSessionClient();
  if (!session) return null;
  const missions = await getMissionsClient(session.userId);
  const avecPaiement = missions.filter((m) => m.paiement !== null);

  const anneeEnCours = new Date().getFullYear();
  const moisEnCours = new Date().toISOString().slice(0, 7);
  const depenseAnnuelle = avecPaiement
    .filter((m) => m.date_mission.startsWith(String(anneeEnCours)) && ["sequestre", "libere"].includes(m.paiement!.statut))
    .reduce((s, m) => s + Number(m.montant_total), 0);
  const depenseMois = avecPaiement
    .filter((m) => m.date_mission.startsWith(moisEnCours) && ["sequestre", "libere"].includes(m.paiement!.statut))
    .reduce((s, m) => s + Number(m.montant_total), 0);
  const enAttente = avecPaiement.filter((m) => m.paiement!.statut === "en_attente").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          Factures
        </h1>
        <p className="mt-1 text-[13.5px] text-[#6B6660]">Numérotation PPJ-AAAA-ID, générées automatiquement.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="Dépense annuelle" valeur={`${depenseAnnuelle.toLocaleString("fr-FR")} €`} />
        <StatCard label="Dépense du mois" valeur={`${depenseMois.toLocaleString("fr-FR")} €`} />
        <StatCard label="En attente" valeur={enAttente} />
      </div>

      {avecPaiement.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-[#DDD8D1] py-16 text-center">
          <FileText className="size-7" style={{ color: "#98938B" }} />
          <p className="text-[13.5px] text-[#6B6660]">Aucune facture pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {avecPaiement.map((m) => {
            const emise = STATUTS_FACTURABLES.has(m.paiement!.statut);
            const badge = BADGE_STATUT_FACTURE[m.paiement!.statut];
            return (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14.5px] font-semibold text-[#1A1917]">{referenceMissionClient(m)}</p>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-[#6B6660]">
                    {m.lieu} · {dateCourteFr(m.date_mission)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[16px] text-[#1A1917]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
                    {m.montant_total} €
                  </span>
                  {emise ? (
                    <Link href={`/api/factures/${m.id}`}>
                      <DashButton variant="secondaire">Télécharger</DashButton>
                    </Link>
                  ) : (
                    <Link href={`/missions/${m.id}`}>
                      <DashButton variant="secondaire">Voir le devis</DashButton>
                    </Link>
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
