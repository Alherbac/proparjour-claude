import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, MapPin, CalendarDays, FileDown, MessageCircle } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import { getMissionsRecruteur } from "@/lib/missions";
import { getNotifications } from "@/lib/notifications";
import { AnnulerMissionButton } from "@/components/missions/annuler-mission-button";
import { ConfirmerOuContester } from "@/components/missions/confirmer-ou-contester";
import { cn } from "@/lib/utils";

const STATUTS_ANNULABLES = ["en_attente", "confirmee"];
const STATUTS_FACTURABLES = ["sequestre", "libere"];
const STATUTS_CLOTURABLES = ["confirmee", "en_cours"];

export const metadata: Metadata = {
  title: "Tableau de bord — ProParJour",
};

const TYPE_LABELS: Record<string, string> = {
  recruteur_entreprise: "Recruteur — Entreprise",
  recruteur_particulier: "Recruteur — Particulier",
  admin: "Administrateur",
};

const MISSION_STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente de confirmation",
  confirmee: "Confirmée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
  litige: "Litige",
};

const MISSION_STATUT_STYLES: Record<string, string> = {
  en_attente: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  confirmee: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  en_cours: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  terminee: "bg-secondary text-secondary-foreground",
  annulee: "bg-destructive/10 text-destructive",
  litige: "bg-destructive/10 text-destructive",
};

const LIGNE_STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente de votre réponse",
  acceptee: "Acceptée",
  refusee: "Refusée",
};

/**
 * Tableau de bord recruteur — pas encore restructuré en miroir du
 * nouveau parcours prestataire (Accueil / Missions / Argent / Compte),
 * c'est la prochaine étape. Un prestataire n'atteint jamais cette
 * page : le layout parent le redirige vers /tableau-de-bord/accueil.
 */
export default async function TableauDeBordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/tableau-de-bord");
  }

  const { data: profil } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profil?.type === "prestataire") {
    redirect("/tableau-de-bord/accueil");
  }

  const { data: entreprise } =
    profil?.type === "recruteur_entreprise"
      ? await supabase.from("entreprises").select("*").eq("user_id", user.id).maybeSingle()
      : { data: null };

  const missionsRecruteur = await getMissionsRecruteur(user.id);
  const notifications = await getNotifications();

  return (
    <div className="min-h-full bg-secondary/30">
      <header className="border-b border-border bg-background px-4 py-4 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} notificationsInitiales={notifications} />
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Se déconnecter
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
        <div className="rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                Bonjour {profil?.prenom || "!"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {profil?.type ? TYPE_LABELS[profil.type] : "Profil incomplet"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Mail className="size-4 text-muted-foreground" />
              {user.email}
            </div>
            {profil?.ville && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="size-4 text-muted-foreground" />
                {profil.ville}
              </div>
            )}
          </div>

          {entreprise && (
            <div className="mt-6 space-y-1 border-t border-border pt-6">
              <p className="text-sm font-medium text-foreground">
                {entreprise.raison_sociale}
              </p>
              <p className="text-sm text-muted-foreground">
                SIRET {entreprise.siret} — {entreprise.secteur_activite}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Mes missions
          </h2>
          {missionsRecruteur.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune mission pour l&apos;instant — réservez un prestataire pour en créer une.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {missionsRecruteur.map((mission) => (
                <li
                  key={mission.id}
                  className="rounded-2xl border border-border bg-background p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <CalendarDays className="size-4 text-muted-foreground" />
                      {mission.date_mission} · {mission.lieu}
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        MISSION_STATUT_STYLES[mission.statut],
                      )}
                    >
                      {MISSION_STATUT_LABELS[mission.statut]}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {mission.lignes.map((ligne) => (
                      <li
                        key={ligne.id}
                        className="flex items-center justify-between text-sm text-muted-foreground"
                      >
                        <span>
                          {ligne.prenom} {ligne.nom} · {ligne.heure_debut}–{ligne.heure_fin}
                        </span>
                        <span>{LIGNE_STATUT_LABELS[ligne.statut_acceptation]}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-muted-foreground">
                      Paiement : {mission.paiement?.statut === "sequestre" ? "séquestré" : mission.paiement?.statut}
                    </span>
                    <span className="font-semibold text-foreground">{mission.montant_total} €</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/missions/${mission.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        <MessageCircle className="size-3.5" />
                        Voir la conversation
                      </Link>
                      {mission.paiement && STATUTS_FACTURABLES.includes(mission.paiement.statut) && (
                        <Link
                          href={`/api/factures/${mission.id}`}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                        >
                          <FileDown className="size-3.5" />
                          Télécharger la facture
                        </Link>
                      )}
                    </div>
                    {STATUTS_ANNULABLES.includes(mission.statut) && (
                      <AnnulerMissionButton missionId={mission.id} />
                    )}
                  </div>
                  {STATUTS_CLOTURABLES.includes(mission.statut) && (
                    <div className="mt-3 flex justify-end border-t border-border pt-3">
                      <ConfirmerOuContester missionId={mission.id} />
                    </div>
                  )}
                  {mission.statut === "litige" && mission.motif_litige && (
                    <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      Litige : {mission.motif_litige}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
