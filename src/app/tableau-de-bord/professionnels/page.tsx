import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Users, History, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfessionnelsHistorique } from "@/lib/professionnels-habituels";
import { ProfessionnelHabituelCard } from "@/components/dashboard/professionnel-habituel-card";
import { FavorisSection } from "@/components/dashboard/favoris-section";

export const metadata: Metadata = { title: "Mes professionnels — ProParJour" };

export default async function MesProfessionnelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/professionnels");

  const { data: profil } = await supabase.from("users").select("type").eq("id", user.id).maybeSingle();
  const estRecruteur = profil?.type === "recruteur_entreprise" || profil?.type === "recruteur_particulier";
  if (!estRecruteur) redirect("/tableau-de-bord");

  const { habituels, recents } = await getProfessionnelsHistorique(user.id);
  const idsHabituels = new Set(habituels.map((h) => h.prestataireId));
  const recentsSeuls = recents.filter((r) => !idsHabituels.has(r.prestataireId));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 lg:px-8 lg:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display-serif text-2xl text-foreground sm:text-3xl">Mes professionnels</h1>
          <p className="mt-1 text-sm text-muted-foreground">Vos favoris, vos habitués, et ceux que vous avez récemment sollicités.</p>
        </div>
        {habituels.length > 0 && (
          <Link
            href="/tableau-de-bord/serie-recurrente/nouvelle"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Repeat className="size-4" />
            Créer une série récurrente
          </Link>
        )}
      </div>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <Heart className="size-5 text-destructive" />
          Mes favoris
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Professionnels que vous avez enregistrés.</p>
        <div className="mt-3">
          <FavorisSection />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
          <Users className="size-5 text-primary" />
          Mes professionnels habituels
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Ceux avec qui vous avez réellement travaillé plus d&apos;une fois.</p>
        {habituels.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            Aucun professionnel habituel pour l&apos;instant — il apparaîtra ici après une deuxième mission ensemble.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {habituels.map((h) => (
              <ProfessionnelHabituelCard key={h.prestataireId} professionnel={h} />
            ))}
          </div>
        )}
      </section>

      {recentsSeuls.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
            <History className="size-5 text-muted-foreground" />
            Récemment utilisés
          </h2>
          <div className="mt-3 space-y-3">
            {recentsSeuls.map((r) => (
              <ProfessionnelHabituelCard key={r.prestataireId} professionnel={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
