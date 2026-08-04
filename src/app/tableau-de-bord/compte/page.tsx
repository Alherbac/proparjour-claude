import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mail, Phone, MapPin, ShieldCheck, ShieldAlert, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { METIERS } from "@/config/metiers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DisponibilitesForm } from "@/components/dashboard/disponibilites-form";
import { signOutAction } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "Mon compte — ProParJour",
};

const STATUT_VERIFICATION_LABELS: Record<string, string> = {
  en_attente: "Vérification en attente",
  valide: "Profil vérifié",
  refuse: "Profil refusé",
};

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
      <h2 className="font-heading text-lg font-semibold text-foreground">{titre}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default async function ComptePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/tableau-de-bord/compte");

  const [{ data: profil }, { data: prestataireProfil }] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("prestataires_profils").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  if (profil?.type === "recruteur_entreprise" || profil?.type === "recruteur_particulier") {
    const { data: entreprise } =
      profil.type === "recruteur_entreprise"
        ? await supabase.from("entreprises").select("*").eq("user_id", user.id).maybeSingle()
        : { data: null };
    return <ComptePageRecruteur profil={profil} email={user.email ?? ""} entreprise={entreprise} />;
  }

  if (!prestataireProfil) redirect("/tableau-de-bord");

  const metier = METIERS.find((m) => m.id === prestataireProfil.metier);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Mon compte</h1>

      <Section titre="Mon profil">
        <div className="space-y-2">
          <p className="font-medium text-foreground">
            {profil?.prenom} {profil?.nom}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-4" />
            {user.email}
          </div>
          {profil?.telephone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-4" />
              {profil.telephone}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {prestataireProfil.ville}
          </div>
          <p className="pt-1 text-sm text-foreground">
            {metier?.label ?? prestataireProfil.metier} · {prestataireProfil.tarif_montant} €{" "}
            {prestataireProfil.tarif_type === "horaire" ? "/ heure" : "/ jour"}
          </p>
        </div>
      </Section>

      <Section titre="Mes disponibilités">
        <DisponibilitesForm
          disponibilitesInitiales={prestataireProfil.disponibilites}
          visibleInitial={prestataireProfil.visible}
        />
      </Section>

      <Section titre="Mes documents">
        <div className="flex items-center gap-3">
          {prestataireProfil.statut_verification === "valide" ? (
            <ShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ShieldAlert className="size-6 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {STATUT_VERIFICATION_LABELS[prestataireProfil.statut_verification]}
            </p>
            {prestataireProfil.motif_refus && (
              <p className="text-sm text-destructive">{prestataireProfil.motif_refus}</p>
            )}
          </div>
        </div>
        {prestataireProfil.certifications.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {prestataireProfil.certifications.map((c) => (
              <Badge key={c} variant="secondary" className="font-normal">
                {c}
              </Badge>
            ))}
          </div>
        )}
      </Section>

      <Section titre="Paramètres">
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="rounded-full">
            Se déconnecter
          </Button>
        </form>
      </Section>
    </div>
  );
}

function ComptePageRecruteur({
  profil,
  email,
  entreprise,
}: {
  profil: { prenom: string | null; nom: string | null; telephone: string | null; ville: string | null };
  email: string;
  entreprise: { raison_sociale: string; siret: string; secteur_activite: string } | null;
}) {
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Mon compte</h1>

      <Section titre="Mon profil">
        <div className="space-y-2">
          <p className="font-medium text-foreground">
            {profil.prenom} {profil.nom}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="size-4" />
            {email}
          </div>
          {profil.telephone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-4" />
              {profil.telephone}
            </div>
          )}
          {profil.ville && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {profil.ville}
            </div>
          )}
        </div>
        {entreprise && (
          <div className="mt-3 border-t border-border pt-3 text-sm">
            <p className="font-medium text-foreground">{entreprise.raison_sociale}</p>
            <p className="text-muted-foreground">
              SIRET {entreprise.siret} — {entreprise.secteur_activite}
            </p>
          </div>
        )}
      </Section>

      <Section titre="Moyens de paiement">
        <div className="flex items-center gap-3">
          <CreditCard className="size-6 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Le paiement se fait par carte au moment de la réservation. Aucune carte enregistrée pour
            l&apos;instant.
          </p>
        </div>
      </Section>

      <Section titre="Paramètres">
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="rounded-full">
            Se déconnecter
          </Button>
        </form>
      </Section>
    </div>
  );
}
