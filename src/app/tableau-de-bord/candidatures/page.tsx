import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, MapPin, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCandidaturesPrestataire } from "@/lib/offres";
import { METIERS } from "@/config/metiers";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Mes candidatures — ProParJour" };

const STATUT_INFO: Record<string, { label: string; classe: string }> = {
  en_attente: { label: "En attente", classe: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  acceptee: { label: "Acceptée", classe: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  refusee: { label: "Refusée", classe: "bg-secondary text-muted-foreground" },
};

export default async function MesCandidaturesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/candidatures");

  const { data: profil } = await supabase.from("prestataires_profils").select("id").eq("user_id", user.id).maybeSingle();
  if (!profil) redirect("/tableau-de-bord");

  const candidatures = await getCandidaturesPrestataire(profil.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8 lg:py-12">
      <h1 className="font-display-serif text-2xl text-foreground sm:text-3xl">Mes candidatures</h1>
      <p className="mt-1 text-sm text-muted-foreground">Suivez l&apos;avancement de vos candidatures aux missions.</p>

      {candidatures.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 py-10 text-center">
          <ClipboardList className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">Vous n&apos;avez pas encore candidaté à une mission.</p>
          <Link
            href="/tableau-de-bord/offres"
            className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Explorer les missions
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {candidatures.map((candidature) => {
            const offre = candidature.offre;
            const metier = offre ? METIERS.find((m) => m.id === offre.metier) : undefined;
            const info = STATUT_INFO[candidature.statut] ?? STATUT_INFO.en_attente;
            return (
              <li key={candidature.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{offre?.titre ?? "Offre supprimée"}</p>
                    <p className="text-sm text-muted-foreground">{metier?.filiere}</p>
                  </div>
                  <Badge className={info.classe}>{info.label}</Badge>
                </div>
                {offre && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {offre.ville}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {offre.date_mission}
                    </span>
                  </div>
                )}
                {offre && (
                  <Link
                    href={`/tableau-de-bord/offres/${offre.id}`}
                    className="mt-3 inline-block text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    Voir la mission
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
