import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  FileWarning,
  Megaphone,
  Clock,
  CreditCard,
  UserPlus,
  Building2,
  Send,
  CheckCircle2,
  Users,
  Wallet,
  TrendingUp,
  UserX,
  ShieldAlert,
  Flag,
} from "lucide-react";
import { requireAdminSession } from "@/lib/admin/auth";
import { getResumeATraiter, getActivitePlateforme, getSurveillance } from "@/lib/admin/dashboard";
import type { PeriodeFiltre } from "@/lib/admin/pilotage";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tableau de bord — Admin ProParJour" };

const PERIODES: { value: PeriodeFiltre; label: string }[] = [
  { value: "7j", label: "7 jours" },
  { value: "30j", label: "30 jours" },
  { value: "90j", label: "90 jours" },
  { value: "tout", label: "Tout" },
];

function ActionCard({
  href,
  icon: Icon,
  valeur,
  label,
  sousLabel,
}: {
  href: string;
  icon: typeof AlertTriangle;
  valeur: number;
  label: string;
  sousLabel?: string;
}) {
  const urgent = valeur > 0;
  return (
    <Link
      href={href}
      className={cn(
        "flex items-start gap-3.5 rounded-2xl border p-4 transition-colors",
        urgent
          ? "border-amber-200 bg-amber-50 hover:border-amber-300 dark:border-amber-500/25 dark:bg-amber-500/10"
          : "border-border bg-background hover:border-primary/30",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          urgent ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" : "bg-secondary text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="font-display-serif text-2xl text-foreground">{valeur}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sousLabel && <p className="text-xs text-muted-foreground">{sousLabel}</p>}
      </div>
    </Link>
  );
}

function StatCard({ icon: Icon, valeur, label }: { icon: typeof Users; valeur: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        <Icon className="size-4.5" />
      </div>
      <p className="font-heading text-xl font-semibold text-foreground">{valeur}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function buildHref(periode: string) {
  const params = new URLSearchParams();
  if (periode !== "30j") params.set("periode", periode);
  const qs = params.toString();
  return `/admin${qs ? `?${qs}` : ""}`;
}

export default async function AdminAccueilPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminSession();
  const sp = await searchParams;
  const periodeParam = sp.periode;
  const periode = ((Array.isArray(periodeParam) ? periodeParam[0] : periodeParam) as PeriodeFiltre) || "30j";

  const [resume, activite, surveillance] = await Promise.all([
    getResumeATraiter(),
    getActivitePlateforme(periode),
    getSurveillance(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display-serif text-2xl text-foreground">Bonjour {session.prenom || ""}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Voici ce qui se passe sur ProParJour en ce moment.</p>
      </div>

      {/* À traiter maintenant */}
      <section>
        <h2 className="font-heading text-lg font-semibold text-foreground">À traiter maintenant</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            href="/admin/validations"
            icon={FileWarning}
            valeur={resume.kycEnAttente}
            label="Dossiers KYC en attente"
            sousLabel="Prestataires à valider"
          />
          <ActionCard
            href="/admin/offres"
            icon={Megaphone}
            valeur={resume.offresSansCandidature}
            label="Offres sans candidature"
            sousLabel="Publiées, encore ouvertes"
          />
          <ActionCard
            href="/admin/offres"
            icon={Clock}
            valeur={resume.offresExpirees}
            label="Offres expirées"
            sousLabel="Non pourvues à temps"
          />
          <ActionCard
            href="/admin/missions?statut=litige"
            icon={AlertTriangle}
            valeur={resume.missionsLitige}
            label="Missions en litige"
          />
          <ActionCard
            href="/admin/missions"
            icon={CreditCard}
            valeur={resume.paiementsProblematiques}
            label="Paiements à vérifier"
            sousLabel="Échecs ou remboursements"
          />
        </div>
      </section>

      {/* Activité de la plateforme */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-foreground">Activité de la plateforme</h2>
          <div className="flex flex-wrap gap-2">
            {PERIODES.map((p) => (
              <Link
                key={p.value}
                href={buildHref(p.value)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  periode === p.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground hover:border-primary/40",
                )}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard icon={UserPlus} valeur={String(activite.nouveauxPrestataires)} label="Nouveaux prestataires" />
          <StatCard icon={Building2} valeur={String(activite.nouveauxClients)} label="Nouveaux clients" />
          <StatCard icon={Send} valeur={String(activite.offresPubliees)} label="Offres publiées" />
          <StatCard icon={CheckCircle2} valeur={String(activite.missionsRealisees)} label="Missions réalisées" />
          <StatCard icon={Users} valeur={String(activite.candidatures)} label="Candidatures reçues" />
          <StatCard icon={Wallet} valeur={`${activite.volumeFinancier.toLocaleString("fr-FR")} €`} label="Volume financier" />
          <StatCard
            icon={TrendingUp}
            valeur={activite.tauxConversion !== null ? `${activite.tauxConversion}%` : "—"}
            label="Taux de conversion"
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Taux de conversion = candidatures acceptées ÷ candidatures reçues sur la période. Volume financier = paiements
          en séquestre ou libérés.
        </p>
      </section>

      {/* Surveillance */}
      <section>
        <h2 className="font-heading text-lg font-semibold text-foreground">Surveillance</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            href="/admin/pilotage"
            icon={UserX}
            valeur={surveillance.nbPrestatairesInactifs}
            label="Prestataires inactifs"
            sousLabel="Validés, 30 jours sans connexion"
          />
          <ActionCard
            href="/admin/pilotage"
            icon={ShieldAlert}
            valeur={surveillance.nbRecruteursASurveiller}
            label="Recruteurs à surveiller"
            sousLabel="2 annulations ou plus"
          />
          <ActionCard
            href="/admin/validations"
            icon={Flag}
            valeur={surveillance.prestatairesDocumentsProblematiques.length}
            label="Profils refusés mais visibles"
            sousLabel="Incohérence à corriger"
          />
        </div>

        {surveillance.prestatairesDocumentsProblematiques.length > 0 && (
          <div className="mt-3 space-y-2">
            {surveillance.prestatairesDocumentsProblematiques.map((p) => (
              <Link
                key={p.profilId}
                href={`/admin/validations/${p.profilId}`}
                className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-2.5 text-sm hover:border-primary/30"
              >
                <span className="font-medium text-foreground">
                  {p.prenom ?? "Prestataire"} {p.nom?.charAt(0) ?? ""}.
                </span>
                <span className="truncate text-xs text-muted-foreground">{p.motifRefus ?? "Sans motif renseigné"}</span>
              </Link>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Détection des missions inhabituelles et des signalements utilisateurs : pas encore de source de données dans
          l&apos;app pour ces deux points, donc pas affichés ici plutôt que d&apos;afficher un chiffre inventé.
        </p>
      </section>
    </div>
  );
}
