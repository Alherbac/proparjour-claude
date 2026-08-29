import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Repeat, Plus, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listerSeries } from "@/app/actions/series";

export const metadata: Metadata = { title: "Mes missions récurrentes — ProParJour" };

export default async function SeriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/series");

  const { data: profil } = await supabase.from("users").select("type").eq("id", user.id).maybeSingle();
  const estRecruteur = profil?.type === "recruteur_entreprise" || profil?.type === "recruteur_particulier";
  if (!estRecruteur) redirect("/tableau-de-bord");

  const series = await listerSeries();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display-serif text-2xl text-foreground sm:text-3xl">Mes missions récurrentes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vos besoins planifiés à l&apos;avance, semaine après semaine.</p>
        </div>
        <Link
          href="/tableau-de-bord/serie-recurrente/nouvelle"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]"
        >
          <Plus className="size-4" />
          Nouvelle série
        </Link>
      </div>

      {series.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-secondary/30 p-6 text-center">
          <Repeat className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-foreground">Vous n&apos;avez pas encore de mission récurrente.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Un besoin qui revient chaque semaine ou chaque mois ? Planifiez-le une seule fois.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {series.map((s) => (
            <li key={s.id}>
              <Link
                href={`/tableau-de-bord/series/${s.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Repeat className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{s.titre}</p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{s.lieu}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {s.statut === "annulee" ? (
                    <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">Annulée</span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      Active
                    </span>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.prochaineOccurrence ? `Prochaine : ${s.prochaineOccurrence}` : `${s.nbOccurrences} occurrence${s.nbOccurrences > 1 ? "s" : ""}`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
