import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMissionPourRefaire } from "@/lib/refaire-mission";
import { RefaireMissionForm } from "@/components/dashboard/refaire-mission-form";
import { dateCourteFr } from "@/app/client/_lib";

export const metadata: Metadata = { title: "Refaire cette mission — ProParJour" };

/**
 * Migré depuis l'ancien /tableau-de-bord/missions/[id]/refaire — même
 * logique et mêmes actions réelles (getMissionPourRefaire,
 * RefaireMissionForm, vérification d'équipe, paiement direct),
 * habillage refait dans le système visuel /client.
 */
export default async function RefaireMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/client/missions/${id}/refaire`);

  const mission = await getMissionPourRefaire(id, user.id);
  if (!mission) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/client/missions" className="inline-flex items-center gap-1 text-[13px] text-[#6B6660] transition-colors hover:text-[#1A1917]">
        <ChevronLeft className="size-4" />
        Retour aux missions
      </Link>

      <div>
        <h1 className="text-[26px] text-[#1A1917] sm:text-[30px]" style={{ fontFamily: "var(--font-instrument-serif)" }}>Refaire cette mission</h1>
        <p className="mt-1 text-[13.5px] text-[#6B6660]">
          Mission du {dateCourteFr(mission.dateMission)} · {mission.lieu} — {mission.lignes.length} professionnel{mission.lignes.length > 1 ? "s" : ""}. Choisissez une nouvelle date, l&apos;équipe est déjà prête.
        </p>
      </div>

      <RefaireMissionForm mission={mission} />
    </div>
  );
}
