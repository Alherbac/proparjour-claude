import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Repeat, Users } from "lucide-react";
import { getSerieAvecOccurrences } from "@/app/actions/series";
import { AnnulerSerieButton } from "@/components/dashboard/annuler-serie-button";
import { METIERS } from "@/config/metiers";
import { FREQUENCES } from "@/lib/recurrence";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Série récurrente — ProParJour" };

const STATUT_BADGE: Record<string, { label: string; style: string }> = {
  en_attente: { label: "En attente", style: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  confirmee: { label: "Confirmée", style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  en_cours: { label: "En cours", style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  terminee: { label: "Terminée", style: "bg-secondary text-secondary-foreground" },
  annulee: { label: "Annulée", style: "bg-destructive/10 text-destructive" },
  litige: { label: "Litige", style: "bg-destructive/10 text-destructive" },
};

export default async function SerieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const serie = await getSerieAvecOccurrences(id);
  if (!serie) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8 lg:py-12">
      <Link href="/tableau-de-bord/series" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
        ← Mes missions récurrentes
      </Link>

      <div className="mt-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-primary via-primary to-red-900 p-6 text-white">
        <div className="flex items-center gap-2">
          <Repeat className="size-5" />
          <p className="font-heading text-xl font-semibold">{serie.titre}</p>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-white/80">
          <MapPin className="size-3.5" />
          {serie.lieu}
        </p>
        <p className="mt-1 text-sm text-white/80">
          {FREQUENCES.find((f) => f.value === serie.frequence)?.label} · du {serie.dateDebut} au {serie.dateFin}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            serie.statut === "annulee" ? "bg-destructive/10 text-destructive" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
          )}
        >
          {serie.statut === "annulee" ? "Série annulée" : "Série active"}
        </span>
        {serie.statut === "active" && <AnnulerSerieButton serieId={serie.id} />}
      </div>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <Users className="size-5 text-primary" />
          Postes de la série
        </h2>
        <div className="mt-3 space-y-2">
          {serie.sousBesoins.map((sb) => {
            const metier = METIERS.find((m) => m.id === sb.metier);
            return (
              <div key={sb.id} className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
                <div>
                  <p className="font-medium text-foreground">{sb.prenom ?? "Professionnel"}</p>
                  <p className="text-sm text-muted-foreground">
                    {metier?.label} · {sb.heureDebut} – {sb.heureFin}
                  </p>
                </div>
                <span className="text-sm font-medium text-foreground">{sb.tarifHoraire} €/h</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <CalendarDays className="size-5 text-primary" />
          Occurrences ({serie.missions.length})
        </h2>
        {serie.missions.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            Aucune mission encore rattachée à cette série — le paiement de la première salve n&apos;a peut-être pas abouti.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {serie.missions.map((m) => {
              const badge = STATUT_BADGE[m.statut] ?? { label: m.statut, style: "bg-secondary text-secondary-foreground" };
              return (
                <li key={m.id}>
                  <Link
                    href={`/missions/${m.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/40"
                  >
                    <span className="text-sm font-medium text-foreground">{m.dateMission}</span>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", badge.style)}>{badge.label}</span>
                    <span className="text-sm text-muted-foreground">{m.montantTotal} €</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
