import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, MapPin, CalendarDays, Clock, Euro } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { recommanderMissionsPourPrestataire } from "@/lib/matching";
import { METIERS } from "@/config/metiers";
import { montantMission } from "@/lib/duree";
import { CandidaterButton } from "@/components/dashboard/candidater-button";
import { IconeCritere, classeTexteCritere } from "@/components/prestataire/critere-etat";
import { cn } from "@/lib/utils";
import type { CandidatureStatutType } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Détail de la mission — ProParJour" };

export default async function OffreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/tableau-de-bord/offres/${id}`);

  const { data: profil } = await supabase.from("prestataires_profils").select("id").eq("user_id", user.id).maybeSingle();
  if (!profil) redirect("/tableau-de-bord");

  const { data: offre } = await supabase.from("offres").select("*").eq("id", id).maybeSingle();
  if (!offre) notFound();

  const [{ data: candidature }, recommandations] = await Promise.all([
    supabase
      .from("candidatures")
      .select("statut")
      .eq("offre_id", id)
      .eq("prestataire_id", profil.id)
      .maybeSingle(),
    recommanderMissionsPourPrestataire(user.id),
  ]);

  const compatibilite = recommandations.find((r) => r.offre.id === id) ?? null;
  const metier = METIERS.find((m) => m.id === offre.metier);
  const total = montantMission(offre.heure_debut, offre.heure_fin, offre.tarif_horaire);
  const statutCandidature = candidature?.statut as CandidatureStatutType | undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8 lg:py-12">
      <Link
        href="/tableau-de-bord/offres"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Retour aux missions
      </Link>

      <p className="mt-4 text-sm font-medium text-muted-foreground">{metier?.filiere}</p>
      <h1 className="font-display-serif text-2xl text-foreground sm:text-3xl">{offre.titre}</h1>

      {compatibilite && (
        <section className="mt-5 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            {compatibilite.score}% compatible avec votre profil
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Pourquoi cette mission vous correspond :</p>
          <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {compatibilite.criteres.map((critere) => (
              <li key={critere.cle} className={cn("flex items-center gap-1.5 text-sm text-foreground", classeTexteCritere(critere.etat))}>
                <IconeCritere
                  etat={critere.etat}
                  className={cn("size-4 shrink-0", critere.etat === "correspond" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50")}
                />
                {critere.label}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-background p-5">
        <h2 className="font-heading text-lg font-semibold text-foreground">La mission</h2>
        <div className="mt-3 space-y-2.5 text-sm">
          <p className="flex items-center gap-2 text-foreground">
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            {offre.ville}
          </p>
          <p className="flex items-center gap-2 text-foreground">
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            {offre.date_mission}
          </p>
          <p className="flex items-center gap-2 text-foreground">
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            {offre.heure_debut}–{offre.heure_fin}
          </p>
          <p className="flex items-center gap-2 font-medium text-foreground">
            <Euro className="size-4 shrink-0 text-muted-foreground" />
            {total} € au total ({offre.tarif_horaire} €/heure)
          </p>
          <p className="text-muted-foreground">1 poste</p>
        </div>

        {offre.description && (
          <p className="mt-4 leading-relaxed text-muted-foreground">{offre.description}</p>
        )}
      </section>

      <div className="mt-6">
        <CandidaterButton offreId={offre.id} statutInitial={statutCandidature} postulable={offre.statut === "publiee"} />
      </div>
    </div>
  );
}
