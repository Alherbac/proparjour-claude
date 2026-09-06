import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Repeat, Plus, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listerSeries } from "@/app/actions/series";
import { Badge } from "@/app/client/_components/badge";
import { DashButton } from "@/app/client/_components/button";

export const metadata: Metadata = { title: "Mes missions récurrentes — ProParJour" };

/** Migré depuis l'ancien /tableau-de-bord/series — même logique et données (listerSeries), interface refaite. */
export default async function PageSeries() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/client/series");

  const series = await listerSeries();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>
            Mes missions récurrentes
          </h1>
          <p className="mt-1 text-[13.5px] text-[#6B6660]">Vos besoins planifiés à l&apos;avance, semaine après semaine.</p>
        </div>
        <Link href="/client/series/nouvelle">
          <DashButton variant="plein">
            <Plus className="size-4" />
            Nouvelle série
          </DashButton>
        </Link>
      </div>

      {series.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-[#DDD8D1] py-14 text-center">
          <Repeat className="size-7" style={{ color: "#98938B" }} />
          <p className="text-[13.5px] text-[#1A1917]">Vous n&apos;avez pas encore de mission récurrente.</p>
          <p className="max-w-[40ch] text-[13px] text-[#6B6660]">Un besoin qui revient chaque semaine ou chaque mois ? Planifiez-le une seule fois.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {series.map((s) => (
            <Link key={s.id} href={`/client/series/${s.id}`} className="flex items-center gap-3 rounded-[14px] border border-[#EAE6E0] bg-white p-4 transition-colors hover:border-[#1A1917]">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(226,29,27,.1)" }}>
                <Repeat className="size-5" style={{ color: "#E21D1B" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold text-[#1A1917]">{s.titre}</p>
                <p className="flex items-center gap-1.5 text-[13px] text-[#6B6660]">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{s.lieu}</span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <Badge tone={s.statut === "annulee" ? "gris" : "vert"}>{s.statut === "annulee" ? "Annulée" : "Active"}</Badge>
                <p className="mt-1 text-[11.5px] text-[#98938B]">
                  {s.prochaineOccurrence ? `Prochaine : ${s.prochaineOccurrence}` : `${s.nbOccurrences} occurrence${s.nbOccurrences > 1 ? "s" : ""}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
