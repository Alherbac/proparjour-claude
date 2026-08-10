import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Briefcase, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { METIERS } from "@/config/metiers";
import type { BadgeVerification } from "@/data/freelances-demo";
import { VerificationBadges } from "@/components/prestataire/verification-badges";
import { AvisList } from "@/components/prestataire/avis-list";
import { BookingCard } from "@/components/prestataire/booking-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

async function getPrestataire(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prestataires_publics")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

async function estEnMission(prestataireId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("prestataires_en_mission_ids");
  return (data ?? []).some((r) => r.prestataire_id === prestataireId);
}

async function getFormations(prestataireId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("prestataires_formations")
    .select("*")
    .eq("prestataire_id", prestataireId)
    .order("annee_obtention", { ascending: false });
  return data ?? [];
}

async function getExperiences(prestataireId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("experiences")
    .select("*")
    .eq("prestataire_id", prestataireId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const prestataire = await getPrestataire(id);
  if (!prestataire) return {};

  const metier = METIERS.find((m) => m.id === prestataire.metier);
  const prenom = prestataire.prenom ?? "";
  return {
    title: `${prenom} — ${metier?.label} à ${prestataire.ville} | ProParJour`,
    description: prestataire.bio ?? undefined,
  };
}

export default async function PrestataireProfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prestataire = await getPrestataire(id);
  if (!prestataire) notFound();
  const [formations, experiences, enMission] = await Promise.all([
    getFormations(id),
    getExperiences(id),
    estEnMission(id),
  ]);

  const metier = METIERS.find((m) => m.id === prestataire.metier);
  const prenom = prestataire.prenom ?? "Prestataire";
  const nom = prestataire.nom ?? "";

  const badges: BadgeVerification[] = [];
  if (prestataire.statut_verification === "valide") badges.push("identite");
  if (prestataire.metier === "securite" && prestataire.cnaps_verifie) {
    badges.push("cnaps");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8 lg:py-14">
      <Link
        href="/"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Retour
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-10">
          <div className="flex flex-col gap-6 sm:flex-row">
            {prestataire.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet, cf. next.config.ts sans remotePatterns
              <img
                src={prestataire.photo_url}
                alt={`${prenom} ${nom}`}
                className="size-32 shrink-0 rounded-2xl object-cover sm:size-40"
              />
            ) : (
              <div
                className={cn(
                  "flex size-32 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-heading text-4xl font-semibold text-foreground/70 sm:size-40",
                  metier?.accent.gradient,
                )}
              >
                {prenom.charAt(0)}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-3xl font-semibold text-foreground">
                  {prenom} {nom}
                </h1>
                {enMission && (
                  <Badge className="bg-amber-500 text-xs font-medium text-white hover:bg-amber-500">
                    En mission
                  </Badge>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                <Briefcase className="size-4" />
                {prestataire.titre || metier?.label}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4" />
                {prestataire.ville}
              </p>

              {badges.length > 0 && (
                <VerificationBadges badges={badges} className="mt-4" />
              )}
            </div>
          </div>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              À propos
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {prestataire.bio || "Ce prestataire n'a pas encore rédigé de présentation."}
            </p>
          </section>

          {prestataire.specialites.length > 0 && (
            <section>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Spécialités
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {prestataire.specialites.map((specialite) => (
                  <Badge key={specialite} variant="secondary" className="font-normal">
                    {specialite}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {prestataire.competences.length > 0 && (
            <section>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Compétences
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {prestataire.competences.map((competence) => (
                  <Badge key={competence} variant="secondary" className="font-normal">
                    {competence}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {formations.length > 0 && (
            <section>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Formations
              </h2>
              <ul className="mt-3 space-y-3">
                {formations.map((formation) => (
                  <li key={formation.id} className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{formation.diplome}</span>
                    {" — "}
                    {formation.etablissement}
                    {formation.annee_obtention ? ` (${formation.annee_obtention})` : ""}
                    {formation.description && (
                      <p className="mt-0.5 text-muted-foreground/80">{formation.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {experiences.length > 0 && (
            <section>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Expériences
              </h2>
              <ul className="mt-3 space-y-4">
                {experiences.map((experience) => (
                  <li key={experience.id} className="text-sm">
                    <p className="font-medium text-foreground">{experience.intitule}</p>
                    <p className="text-muted-foreground">
                      {[experience.employeur, experience.periode, experience.lieu]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {experience.description && (
                      <p className="mt-1 text-muted-foreground/80">{experience.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Disponibilités
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {prestataire.disponibilites.map((jour) => (
                <span
                  key={jour}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-foreground"
                >
                  <CalendarDays className="size-3.5 text-primary" />
                  {jour}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Avis
            </h2>
            <div className="mt-4">
              <AvisList avis={[]} />
            </div>
          </section>
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <BookingCard
            freelance={{
              id: prestataire.id,
              prenom,
              metier: prestataire.metier,
              ville: prestataire.ville,
              tarifMontant: prestataire.tarif_montant,
              tarifType: prestataire.tarif_type,
              photoUrl: prestataire.photo_url,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
