import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Repeat, Users } from "lucide-react";
import { getSerieAvecOccurrences } from "@/app/actions/series";
import { FREQUENCES } from "@/lib/recurrence";
import { AnnulerSerieButton } from "@/app/client/series/annuler-serie-button";
import { Badge } from "@/app/client/_components/badge";
import { BADGE_STATUT_MISSION } from "@/app/client/_lib";
import { LABEL_METIER } from "@/app/client/_types";
import type { MissionStatutType, MetierType } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Série récurrente — ProParJour" };

function dateCourteFr(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Migré depuis l'ancien /tableau-de-bord/series/[id] — même logique et données (getSerieAvecOccurrences, annulerSerie), interface refaite. */
export default async function PageSerieDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const serie = await getSerieAvecOccurrences(id);
  if (!serie) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/client/series" className="text-[13px] text-[#6B6660] transition-colors hover:text-[#1A1917]">
        ← Mes missions récurrentes
      </Link>

      <div className="rounded-[18px] p-6 text-white" style={{ backgroundColor: "#1A1917" }}>
        <div className="flex items-center gap-2">
          <Repeat className="size-5" />
          <p className="text-[19px] font-bold">{serie.titre}</p>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-white/75">
          <MapPin className="size-3.5" />
          {serie.lieu}
        </p>
        <p className="mt-1 text-[13px] text-white/75">
          {FREQUENCES.find((f) => f.value === serie.frequence)?.label} · du {serie.dateDebut} au {serie.dateFin}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Badge tone={serie.statut === "annulee" ? "gris" : "vert"}>{serie.statut === "annulee" ? "Série annulée" : "Série active"}</Badge>
        {serie.statut === "active" && <AnnulerSerieButton serieId={serie.id} />}
      </div>

      <section>
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#1A1917]">
          <Users className="size-4.5" style={{ color: "#E21D1B" }} />
          Postes de la série
        </h2>
        <div className="mt-3 space-y-2.5">
          {serie.sousBesoins.map((sb) => (
            <div key={sb.id} className="flex items-center justify-between rounded-[14px] border border-[#EAE6E0] bg-white p-4">
              <div>
                <p className="text-[14px] font-semibold text-[#1A1917]">{sb.prenom ?? "Professionnel"}</p>
                <p className="text-[13px] text-[#6B6660]">
                  {LABEL_METIER[sb.metier as MetierType]} · {sb.heureDebut} – {sb.heureFin}
                </p>
              </div>
              <span className="text-[14px] font-semibold text-[#1A1917]">{sb.tarifHoraire} €/h</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#1A1917]">
          <CalendarDays className="size-4.5" style={{ color: "#E21D1B" }} />
          Occurrences ({serie.missions.length})
        </h2>
        {serie.missions.length === 0 ? (
          <p className="mt-3 rounded-[14px] border border-dashed border-[#DDD8D1] p-4 text-[13px] text-[#6B6660]">
            Aucune mission encore rattachée à cette série — le paiement de la première salve n&apos;a peut-être pas abouti.
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {serie.missions.map((m) => {
              const statut = m.statut as MissionStatutType;
              const badge = BADGE_STATUT_MISSION[statut] ?? { label: m.statut, tone: "gris" as const };
              return (
                <Link key={m.id} href={`/missions/${m.id}`} className="flex items-center justify-between gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4 transition-colors hover:border-[#1A1917]">
                  <span className="text-[13.5px] font-semibold text-[#1A1917]">{dateCourteFr(m.dateMission)}</span>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                  <span className="text-[13px] text-[#6B6660]">{m.montantTotal} €</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
