import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  getResumeATraiter,
  getActivitePlateforme,
  getEffectifsTotaux,
  getInscritsParMetier,
} from "@/lib/admin/dashboard";
import { getActiviteTempsReel, getFrequentation14j } from "@/lib/admin/analytics";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminButton } from "@/components/admin/ui/button";
import { AdminKpiCard } from "@/components/admin/ui/kpi-card";
import { AdminBadge } from "@/components/admin/ui/badge";

export const metadata: Metadata = { title: "Tableau de bord — Admin ProParJour" };

const EUR = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;

function ActionCard({
  href,
  valeur,
  couleur,
  label,
  phrase,
  actionLabel,
}: {
  href: string;
  valeur: number;
  couleur: string;
  label: string;
  phrase: string;
  actionLabel: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4 pl-[15px]"
      style={{ borderLeft: `3px solid ${couleur}` }}
    >
      <p className="a-tabular text-[22px] font-extrabold" style={{ fontFamily: "var(--a-font-display)", color: couleur }}>
        {valeur}
      </p>
      <p className="mt-0.5 text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
        {label}
      </p>
      <p className="mt-0.5 text-[12px] text-[var(--a-text-2)]">{phrase}</p>
      <p className="mt-1.5 text-[12px] font-bold" style={{ color: "var(--a-accent)" }}>
        {actionLabel} →
      </p>
    </Link>
  );
}

export default async function AdminAccueilPage() {
  const session = await requireAdminSession();
  const [resume, activite30j, effectifs, inscrits, activiteTempsReel, frequentation] = await Promise.all([
    getResumeATraiter(),
    getActivitePlateforme("30j"),
    getEffectifsTotaux(),
    getInscritsParMetier(),
    getActiviteTempsReel(),
    getFrequentation14j(),
  ]);
  const maxFrequentation = Math.max(1, ...frequentation.map((j) => j.nb));

  const dateDuJour = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <AdminH1 size="30">Bonjour, {session.prenom || "Administrateur"}</AdminH1>
          <p className="mt-1.5 text-[13.5px] text-[var(--a-text-2)]">
            {dateDuJour.charAt(0).toUpperCase() + dateDuJour.slice(1)} · {resume.kycEnAttente} dossier
            {resume.kycEnAttente > 1 ? "s" : ""} à valider · {effectifs.missionsEnCours} mission
            {effectifs.missionsEnCours > 1 ? "s" : ""} en cours · {resume.missionsLitige} litige
            {resume.missionsLitige > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <Link href="/admin/validations">
            <AdminButton variant="primary">Traiter les validations</AdminButton>
          </Link>
          <Link href="/admin/stats">
            <AdminButton variant="secondary">Statistiques</AdminButton>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(230px, 100%), 1fr))" }}>
        <AdminKpiCard label="Utilisateurs" valeur={String(effectifs.totalUtilisateurs)} delta={`+${activite30j.nouveauxPrestataires + activite30j.nouveauxClients}`} deltaTone="up" aide="sur 30 jours" size="lg" />
        <AdminKpiCard label="Prestataires" valeur={String(effectifs.totalPrestataires)} delta={`+${activite30j.nouveauxPrestataires}`} deltaTone="up" aide="sur 30 jours" size="lg" />
        <AdminKpiCard label="Clients" valeur={String(effectifs.totalClients)} delta={`+${activite30j.nouveauxClients}`} deltaTone="up" aide="sur 30 jours" size="lg" />
        <AdminKpiCard label="Missions en cours" valeur={String(effectifs.missionsEnCours)} aide="confirmées ou en cours" size="lg" />
        <AdminKpiCard label="Volume d'affaires" valeur={EUR(effectifs.volumeAffairesTotal)} aide="séquestré ou libéré" size="lg" />
        <AdminKpiCard label="Commissions" valeur={EUR(effectifs.commissionsTotal)} aide="sur missions actives" size="lg" />
        <AdminKpiCard label="Dossiers à valider" valeur={String(resume.kycEnAttente)} deltaTone={resume.kycEnAttente > 0 ? "down" : "neutral"} aide="prestataires en attente" size="lg" />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" }}>
        <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ background: "var(--a-green)" }} />
              <h2 className="text-[14.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
                Activité en temps réel
              </h2>
            </div>
            <span className="a-tabular text-[19px] font-extrabold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
              {activiteTempsReel.visiteursActifs}
            </span>
          </div>
          <div className="mt-3 space-y-1.5">
            {activiteTempsReel.pagesPlusVues.length === 0 ? (
              <p className="text-[12.5px] text-[var(--a-text-3)]">
                Aucune visite mesurée pour l&apos;instant — le tracker est posé (visites, gardé par le consentement
                « audience »), les chiffres apparaîtront dès la première visite consentie.
              </p>
            ) : (
              activiteTempsReel.pagesPlusVues.map((p) => (
                <div key={p.chemin} className="flex items-center justify-between rounded-[10px] px-3 py-2 text-[12.5px]" style={{ background: "var(--a-surface-2)" }}>
                  <span className="min-w-0 truncate text-[var(--a-ink)]">{p.chemin}</span>
                  <span className="shrink-0 font-bold text-[var(--a-ink)]">{p.nb}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
          <h2 className="text-[14.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
            Fréquentation
          </h2>
          <div className="mt-4 flex h-[118px] items-end gap-1.5">
            {frequentation.map((j) => (
              <div key={j.jour} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-[4px_4px_2px_2px]"
                  style={{ height: `${Math.max(3, (j.nb / maxFrequentation) * 100)}%`, background: j.estAujourdhui ? "var(--a-accent)" : "var(--a-surface-3)" }}
                  title={`${j.jour} : ${j.nb}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--a-text-3)]">
            <span>{frequentation[0]?.jour}</span>
            <span>Aujourd&apos;hui</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[14.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
            Inscrits par métier
          </h2>
          <p className="text-[12px] text-[var(--a-text-2)]">
            {inscrits.total} prestataire{inscrits.total > 1 ? "s" : ""} inscrit{inscrits.total > 1 ? "s" : ""}, tous statuts confondus
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {inscrits.familles.map((f) => (
            <div key={f.metier} className="flex flex-wrap items-center gap-3">
              <span className={`size-2 shrink-0 rounded-full ${f.couleur}`} />
              <span className="w-[190px] shrink-0 truncate text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
                {f.label}
              </span>
              <span className="a-tabular text-[17px] font-extrabold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
                {f.total}
              </span>
              <span className="text-[12px] text-[var(--a-text-3)]">
                {inscrits.total > 0 ? Math.round((f.total / inscrits.total) * 100) : 0}%
              </span>
              <div className="ml-auto flex shrink-0 gap-1.5">
                <AdminBadge tone="green">{f.valides} validés</AdminBadge>
                <AdminBadge tone="orange">{f.enAttente} en attente</AdminBadge>
                <AdminBadge tone="red">{f.refuses} refusés</AdminBadge>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11.5px] text-[var(--a-text-3)]">
          Familles et effectifs lus depuis la configuration métier réelle de l&apos;app — une famille ajoutée y
          apparaît sans changement de code.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-[14.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
          À traiter aujourd&apos;hui
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <ActionCard
            href="/admin/validations"
            valeur={resume.kycEnAttente}
            couleur="var(--a-accent)"
            label="Profils à valider"
            phrase="Dossiers prestataires en attente de décision."
            actionLabel="Ouvrir la file"
          />
          <ActionCard
            href="/admin/missions"
            valeur={resume.paiementsProblematiques}
            couleur="var(--a-orange)"
            label="Paiements à arbitrer"
            phrase="Échecs ou remboursements à vérifier."
            actionLabel="Voir les missions"
          />
          <ActionCard
            href="/admin/missions?statut=litige"
            valeur={resume.missionsLitige}
            couleur="var(--a-violet)"
            label="Litiges ouverts"
            phrase="Missions en désaccord entre les parties."
            actionLabel="Arbitrer"
          />
        </div>
      </div>
    </div>
  );
}
