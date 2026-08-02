import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Briefcase, CalendarDays } from "lucide-react";
import { FREELANCES_DEMO } from "@/data/freelances-demo";
import { METIERS } from "@/config/metiers";
import { VerificationBadges } from "@/components/prestataire/verification-badges";
import { StarRating } from "@/components/prestataire/star-rating";
import { AvisList } from "@/components/prestataire/avis-list";
import { BookingCard } from "@/components/prestataire/booking-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return FREELANCES_DEMO.map((freelance) => ({ id: freelance.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const freelance = FREELANCES_DEMO.find((f) => f.id === id);
  if (!freelance) return {};

  const metier = METIERS.find((m) => m.id === freelance.metier);
  return {
    title: `${freelance.prenom} ${freelance.nom} — ${metier?.label} à ${freelance.ville} | ProParJour`,
    description: freelance.bio,
  };
}

export default async function PrestataireProfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const freelance = FREELANCES_DEMO.find((f) => f.id === id);
  if (!freelance) notFound();

  const metier = METIERS.find((m) => m.id === freelance.metier);

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
            <div
              className={cn(
                "flex size-32 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-heading text-4xl font-semibold text-foreground/70 sm:size-40",
                freelance.gradient,
              )}
            >
              {freelance.prenom.charAt(0)}
            </div>

            <div className="min-w-0">
              <h1 className="font-heading text-3xl font-semibold text-foreground">
                {freelance.prenom} {freelance.nom}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                <Briefcase className="size-4" />
                {`${metier?.label} · ${freelance.anneesExperience} ans d'expérience`}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4" />
                {freelance.ville}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <StarRating note={freelance.note} size="md" />
                <span className="font-medium text-foreground">
                  {freelance.note.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({freelance.nombreAvis} avis)
                </span>
              </div>

              <VerificationBadges badges={freelance.badges} className="mt-4" />
            </div>
          </div>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              À propos
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {freelance.bio}
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Spécialités
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {freelance.specialites.map((specialite) => (
                <Badge key={specialite} variant="secondary" className="font-normal">
                  {specialite}
                </Badge>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Disponibilités
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {freelance.disponibilites.map((jour) => (
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
              Avis ({freelance.nombreAvis})
            </h2>
            <div className="mt-4">
              <AvisList avis={freelance.avis} />
            </div>
          </section>
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <BookingCard freelance={freelance} />
        </aside>
      </div>
    </div>
  );
}
