import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mail, MapPin, Phone, CalendarDays } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import { METIERS } from "@/config/metiers";
import { getMissionsRecruteur, getMissionsPrestataire } from "@/lib/missions";
import { ReponseMissionButtons } from "@/components/missions/reponse-mission-buttons";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tableau de bord — ProParJour",
};

const TYPE_LABELS: Record<string, string> = {
  prestataire: "Prestataire",
  recruteur_entreprise: "Recruteur — Entreprise",
  recruteur_particulier: "Recruteur — Particulier",
  admin: "Administrateur",
};

const STATUT_VERIFICATION_LABELS: Record<string, string> = {
  en_attente: "Vérification en attente",
  valide: "Profil vérifié",
  refuse: "Profil refusé",
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

  const [{ data: prestataireProfil }, { data: entreprise }] = await Promise.all([
    profil?.type === "prestataire"
      ? supabase.from("prestataires_profils").select("*").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    profil?.type === "recruteur_entreprise"
      ? supabase.from("entreprises").select("*").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const estRecruteur = profil?.type === "recruteur_entreprise" || profil?.type === "recruteur_particulier";
  const missionsRecruteur = estRecruteur ? await getMissionsRecruteur(user.id) : [];
  const missionsPrestataire = profil?.type === "prestataire" ? await getMissionsPrestataire(user.id) : [];

  const metier = METIERS.find((m) => m.id === prestataireProfil?.metier);

  return (
    <div className="min-h-full bg-secondary/30">
      <header className="border-b border-border bg-background px-4 py-4 lg:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo />
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Se déconnecter
            </Button>
          </form>
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
            {prestataireProfil && (
              <Badge variant="secondary" className="font-normal">
                {STATUT_VERIFICATION_LABELS[prestataireProfil.statut_verification]}
              </Badge>
            )}
          </div>

          <div className="mt-6 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Mail className="size-4 text-muted-foreground" />
              {user.email}
            </div>
            {profil?.telephone && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Phone className="size-4 text-muted-foreground" />
                {profil.telephone}
              </div>
            )}
            {(profil?.ville || prestataireProfil?.ville) && (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="size-4 text-muted-foreground" />
                {profil?.ville || prestataireProfil?.ville}
              </div>
            )}
          </div>

          {prestataireProfil && (
            <div className="mt-6 space-y-3 border-t border-border pt-6">
              <p className="text-sm font-medium text-foreground">
                Métier : {metier?.label ?? prestataireProfil.metier}
              </p>
              <p className="text-sm text-muted-foreground">
                Tarif : {prestataireProfil.tarif_montant} €{" "}
                {prestataireProfil.tarif_type === "horaire" ? "/ heure" : "/ jour"}
              </p>
              {prestataireProfil.specialites.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {prestataireProfil.specialites.map((specialite) => (
                    <Badge key={specialite} variant="secondary" className="font-normal">
                      {specialite}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

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

        {estRecruteur && (
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {profil?.type === "prestataire" && (
          <div className="mt-8">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Missions proposées
            </h2>
            {missionsPrestataire.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Aucune mission proposée pour l&apos;instant.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {missionsPrestataire.map((ligne) => (
                  <li
                    key={ligne.id}
                    className="rounded-2xl border border-border bg-background p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        {ligne.mission.date_mission} · {ligne.mission.lieu}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {ligne.heure_debut}–{ligne.heure_fin} · {ligne.tarif_applique} €
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-sm text-muted-foreground">
                        {LIGNE_STATUT_LABELS[ligne.statut_acceptation]}
                      </span>
                      {ligne.statut_acceptation === "en_attente" && (
                        <ReponseMissionButtons ligneId={ligne.id} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
