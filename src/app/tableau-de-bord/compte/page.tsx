import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mail, Phone, MapPin, ShieldCheck, ShieldAlert, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DisponibilitesForm } from "@/components/dashboard/disponibilites-form";
import { CalendrierDisponibilites } from "@/components/dashboard/calendrier-disponibilites";
import { MesJustificatifs } from "@/components/dashboard/mes-justificatifs";
import { MesExperiences } from "@/components/dashboard/mes-experiences";
import { ModifierProfilPrestataireForm } from "@/components/dashboard/modifier-profil-prestataire-form";
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

  const [
    { data: justificatifs },
    { data: formations },
    { data: exceptionsDisponibilites },
    { data: experiences },
  ] = await Promise.all([
    supabase.from("justificatifs").select("*").eq("prestataire_id", prestataireProfil.id),
    supabase
      .from("prestataires_formations")
      .select("*")
      .eq("prestataire_id", prestataireProfil.id)
      .order("annee_obtention", { ascending: false }),
    supabase
      .from("prestataires_disponibilites_exceptions")
      .select("*")
      .eq("prestataire_id", prestataireProfil.id),
    supabase
      .from("experiences")
      .select("*")
      .eq("prestataire_id", prestataireProfil.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Mon compte</h1>

      <Section titre="Mon profil">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="size-4" />
          {user.email}
        </div>

        <ModifierProfilPrestataireForm user={{ prenom: profil?.prenom ?? null, nom: profil?.nom ?? null, telephone: profil?.telephone ?? null }} profil={prestataireProfil} />

        {formations && formations.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">Formations</p>
            <ul className="mt-2 space-y-2">
              {formations.map((formation) => (
                <li key={formation.id} className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{formation.diplome}</span>
                  {" — "}
                  {formation.etablissement}
                  {formation.annee_obtention ? ` (${formation.annee_obtention})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section titre="Mes disponibilités">
        <DisponibilitesForm
          disponibilitesInitiales={prestataireProfil.disponibilites}
          visibleInitial={prestataireProfil.visible}
        />
        <div className="mt-5 border-t border-border pt-5">
          <p className="mb-3 text-sm font-medium text-foreground">
            Calendrier — jours et horaires précis
          </p>
          <CalendrierDisponibilites
            disponibilitesHebdo={prestataireProfil.disponibilites}
            exceptionsInitiales={exceptionsDisponibilites ?? []}
          />
        </div>
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
        <div className="mt-4 border-t border-border pt-4">
          <MesJustificatifs
            profilId={prestataireProfil.id}
            metier={prestataireProfil.metier}
            justificatifsInitiaux={justificatifs ?? []}
          />
        </div>
      </Section>

      <Section titre="Expériences">
        <MesExperiences experiencesInitiales={experiences ?? []} />
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
