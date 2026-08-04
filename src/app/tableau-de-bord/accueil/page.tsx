import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, MapPin, Wallet, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMissionsPrestataire } from "@/lib/missions";

export const metadata: Metadata = {
  title: "Accueil — ProParJour",
};

export default async function AccueilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/accueil");

  const { data: profil } = await supabase
    .from("users")
    .select("prenom")
    .eq("id", user.id)
    .maybeSingle();

  const lignes = await getMissionsPrestataire(user.id);

  const aRepondre = lignes.filter((l) => l.statut_acceptation === "en_attente");
  const aVenir = lignes
    .filter(
      (l) =>
        l.statut_acceptation === "acceptee" &&
        (l.mission.statut === "confirmee" || l.mission.statut === "en_cours"),
    )
    .sort((a, b) => a.mission.date_mission.localeCompare(b.mission.date_mission));
  const prochaine = aVenir[0];

  const montantEnAttente = lignes
    .filter((l) => l.paiement?.statut === "sequestre")
    .reduce((somme, l) => somme + l.tarif_applique, 0);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-foreground">
        Bonjour {profil?.prenom || ""}
      </h1>

      {aRepondre.length > 0 && (
        <Link
          href="/tableau-de-bord/missions"
          className="flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <Bell className="size-6 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium text-foreground">
              {aRepondre.length === 1
                ? "Une mission attend votre réponse"
                : `${aRepondre.length} missions attendent votre réponse`}
            </p>
            <p className="text-sm text-muted-foreground">Touchez pour répondre</p>
          </div>
        </Link>
      )}

      <Link
        href="/tableau-de-bord/missions"
        className="block rounded-2xl border border-border bg-background p-5 shadow-sm"
      >
        <p className="text-sm font-medium text-muted-foreground">Prochaine mission</p>
        {prochaine ? (
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2 text-foreground">
              <CalendarDays className="size-4 text-muted-foreground" />
              {prochaine.mission.date_mission} · {prochaine.heure_debut}–{prochaine.heure_fin}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {prochaine.mission.lieu}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Aucune mission à venir pour l&apos;instant.</p>
        )}
      </Link>

      <Link
        href="/tableau-de-bord/argent"
        className="flex items-center gap-3 rounded-2xl border border-border bg-background p-5 shadow-sm"
      >
        <Wallet className="size-6 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">Montant en attente</p>
          <p className="font-heading text-xl font-semibold text-foreground">
            {montantEnAttente.toFixed(2)} €
          </p>
        </div>
      </Link>
    </div>
  );
}
