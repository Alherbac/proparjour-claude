import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOffresPubliees, getCandidaturesPrestataire } from "@/lib/offres";
import { recommanderMissionsPourPrestataire } from "@/lib/matching";
import { OffresBrowser } from "@/components/dashboard/offres-browser";
import { MissionHeroCard } from "@/components/dashboard/mission-hero-card";
import { MissionCompactCard } from "@/components/dashboard/mission-compact-card";
import type { CandidatureStatutType } from "@/lib/supabase/database.types";

export const metadata: Metadata = {
  title: "Missions — ProParJour",
};

const CAP_RECOMMANDEES = 3;

export default async function OffresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/offres");

  const { data: profil } = await supabase
    .from("prestataires_profils")
    .select("id, metier")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profil) redirect("/tableau-de-bord");

  const [offres, candidatures, recommandees] = await Promise.all([
    getOffresPubliees({}),
    getCandidaturesPrestataire(profil.id),
    recommanderMissionsPourPrestataire(user.id),
  ]);

  const candidaturesParOffre = Object.fromEntries(candidatures.map((c) => [c.offre_id, c.statut]));
  const recommandeesAffichees = recommandees.slice(0, CAP_RECOMMANDEES);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8 lg:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display-serif text-2xl text-foreground sm:text-3xl">Toutes les missions</h1>
        <Link
          href="/tableau-de-bord/candidatures"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        >
          <ClipboardList className="size-4" />
          Mes candidatures
        </Link>
      </div>

      {recommandeesAffichees.length > 0 && (
        <section className="mb-10">
          <h2 className="font-heading text-xl font-semibold text-foreground">Recommandées pour vous</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sélectionnées selon votre métier, vos disponibilités et votre profil.
          </p>
          <div className="mt-4">
            <MissionHeroCard
              recommandation={recommandeesAffichees[0]}
              statutCandidature={candidaturesParOffre[recommandeesAffichees[0].offre.id] as CandidatureStatutType | undefined}
            />
          </div>
          {recommandeesAffichees.length > 1 && (
            <div className="mt-3 space-y-3">
              {recommandeesAffichees.slice(1).map((r) => (
                <MissionCompactCard
                  key={r.offre.id}
                  recommandation={r}
                  statutCandidature={candidaturesParOffre[r.offre.id] as CandidatureStatutType | undefined}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <div className="border-t border-border pt-8">
        <OffresBrowser
          offres={offres}
          candidaturesParOffre={candidaturesParOffre}
          metierDefaut={profil.metier}
          postulable
          titre="Explorer toutes les missions"
          sousTitre="Vous préférez chercher vous-même ? Parcourez toutes les offres publiées."
        />
      </div>
    </div>
  );
}
