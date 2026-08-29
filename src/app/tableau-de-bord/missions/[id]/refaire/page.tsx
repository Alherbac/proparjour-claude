import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMissionPourRefaire } from "@/lib/refaire-mission";
import { RefaireMissionForm } from "@/components/dashboard/refaire-mission-form";

export const metadata: Metadata = { title: "Refaire cette mission — ProParJour" };

export default async function RefaireMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/tableau-de-bord/missions/${id}/refaire`);

  const mission = await getMissionPourRefaire(id, user.id);
  if (!mission) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8 lg:py-12">
      <Link
        href="/tableau-de-bord/missions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Retour aux missions
      </Link>

      <h1 className="mt-4 font-display-serif text-2xl text-foreground sm:text-3xl">Refaire cette mission</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Mission du {mission.dateMission} · {mission.lieu} — {mission.lignes.length} professionnel
        {mission.lignes.length > 1 ? "s" : ""}. Choisissez une nouvelle date, l&apos;équipe est déjà prête.
      </p>

      <div className="mt-6">
        <RefaireMissionForm mission={mission} />
      </div>
    </div>
  );
}
