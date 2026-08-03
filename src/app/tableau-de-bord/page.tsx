import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions/auth";
import { METIERS } from "@/config/metiers";

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
      </div>
    </div>
  );
}
