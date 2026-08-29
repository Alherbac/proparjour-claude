import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Mail, ShieldCheck, ShieldAlert, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DisponibilitesForm } from "@/components/dashboard/disponibilites-form";
import { CalendrierDisponibilites } from "@/components/dashboard/calendrier-disponibilites";
import { MesJustificatifs } from "@/components/dashboard/mes-justificatifs";
import { MesExperiences } from "@/components/dashboard/mes-experiences";
import { ModifierProfilPrestataireForm } from "@/components/dashboard/modifier-profil-prestataire-form";
import { ModifierProfilRecruteurForm } from "@/components/dashboard/modifier-profil-recruteur-form";
import { CoordonneesBancairesForm } from "@/components/dashboard/coordonnees-bancaires-form";
import { HistoriquePaiements } from "@/components/dashboard/historique-paiements";
import { DemanderSuppressionButton } from "@/components/dashboard/demander-suppression-button";
import { getMissionsRecruteur } from "@/lib/missions";
import { signOutAction } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "Mon compte — ProParJour",
};

const STATUT_VERIFICATION_LABELS: Record<string, string> = {
  en_attente: "Vérification en attente",
  valide: "Profil vérifié",
  refuse: "Profil refusé",
};

function Section({ titre, id, children }: { titre: string; id?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24 rounded-2xl border border-border bg-background p-5 shadow-sm">
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
    return <ComptePageRecruteur profil={profil} email={user.email ?? ""} entreprise={entreprise} userId={user.id} />;
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
      <h1 className="font-display-serif text-2xl text-foreground">Mon compte</h1>

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

      <Section titre="Mes disponibilités" id="disponibilites">
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

      <Section titre="Coordonnées bancaires" id="rib">
        <CoordonneesBancairesForm ibanInitial={prestataireProfil.iban} bicInitial={prestataireProfil.bic} />
      </Section>

      <Section titre="Paramètres">
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="rounded-full">
            Se déconnecter
          </Button>
        </form>
      </Section>

      <Section titre="Zone dangereuse">
        <DemanderSuppressionButton />
      </Section>
    </div>
  );
}

async function ComptePageRecruteur({
  profil,
  email,
  entreprise,
  userId,
}: {
  profil: { prenom: string | null; nom: string | null; telephone: string | null; ville: string | null };
  email: string;
  entreprise: { raison_sociale: string; siret: string; secteur_activite: string } | null;
  userId: string;
}) {
  const missions = await getMissionsRecruteur(userId);

  return (
    <div className="space-y-4">
      <h1 className="font-display-serif text-2xl text-foreground">Mon compte</h1>

      <Section titre="Mon profil">
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="size-4" />
          {email}
        </div>
        <ModifierProfilRecruteurForm profil={profil} entreprise={entreprise} />
      </Section>

      <Section titre="Moyens de paiement">
        <div className="flex items-center gap-3">
          <CreditCard className="size-6 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Le paiement se fait par carte au moment de la réservation, sans compte client Stripe ni
            carte enregistrée — chaque paiement est un règlement indépendant.
          </p>
        </div>
      </Section>

      <Section titre="Historique" id="historique">
        <HistoriquePaiements missions={missions} />
      </Section>

      <Section titre="Paramètres">
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="rounded-full">
            Se déconnecter
          </Button>
        </form>
      </Section>

      <Section titre="Zone dangereuse">
        <DemanderSuppressionButton />
      </Section>
    </div>
  );
}
