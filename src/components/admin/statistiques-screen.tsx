"use client";

import { useState } from "react";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminTabs } from "@/components/admin/ui/tabs";
import { AdminKpiCard } from "@/components/admin/ui/kpi-card";
import type { ActivitePlateforme } from "@/lib/admin/dashboard";
import type { VilleOffreDemande } from "@/lib/admin/pilotage";
import type { RepartitionStatutMission } from "@/lib/admin/statistiques";
import type { StatsLive, StatsHistorique } from "@/lib/admin/analytics";

const STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente",
  confirmee: "Contractée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
  litige: "Litige",
};

function Liste({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
      <h2 className="mb-3 text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
        {title}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Ligne({ label, valeur, note, part }: { label: string; valeur: string; note?: string; part?: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[13px] text-[var(--a-ink)]">{label}</span>
        <span className="a-tabular shrink-0 text-[13px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
          {valeur}
        </span>
        {note && <span className="w-[92px] shrink-0 text-right text-[11.5px] text-[var(--a-text-3)]">{note}</span>}
      </div>
      {part !== undefined && (
        <div className="mt-1 h-[6px] overflow-hidden rounded-full bg-[var(--a-surface-2)]">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, part)}%`, background: "var(--a-accent)" }} />
        </div>
      )}
    </div>
  );
}

export function StatistiquesScreen({
  activite30j,
  topVilles,
  missionsParMoisRecent,
  repartitionStatut,
  totalMissions,
  tauxAnnulation,
  live,
  historique,
}: {
  activite30j: ActivitePlateforme;
  topVilles: VilleOffreDemande[];
  missionsParMoisRecent: { mois: string; nb: number }[];
  repartitionStatut: RepartitionStatutMission[];
  totalMissions: number;
  tauxAnnulation: number | null;
  live: StatsLive;
  historique: StatsHistorique;
}) {
  const [onglet, setOnglet] = useState<"live" | "ensemble" | "historique">("ensemble");
  const totalRecruteurs = activite30j.nouveauxPrestataires + activite30j.nouveauxClients;

  return (
    <div className="space-y-5">
      <div>
        <AdminH1>Statistiques</AdminH1>
        <p className="mt-1 text-[13px] text-[var(--a-text-2)]">
          Répartition et activité mesurées. Voir Insights pour les indicateurs stratégiques par thème.
        </p>
      </div>

      <AdminTabs
        tabs={[
          { value: "live", label: "Live" },
          { value: "ensemble", label: "Vue d'ensemble" },
          { value: "historique", label: "Historique" },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === "live" && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <AdminKpiCard label="Visiteurs actifs" valeur={String(live.visiteursActifs)} aide="5 dernières minutes" />
            <AdminKpiCard label="Pages vues / min" valeur={String(live.pagesVuesParMin)} />
            <AdminKpiCard label="Part mobile" valeur={live.partMobile !== null ? `${live.partMobile}%` : "—"} />
            <AdminKpiCard label="Nouveaux" valeur={String(live.nouveaux)} aide="1ère vue il y a < 30 min" />
          </div>
          <Liste title="Provenance géographique">
            <p className="text-[13px] text-[var(--a-text-3)]">
              Aucune géolocalisation n&apos;est collectée (mesure de première partie, sans IP ni fingerprinting) —
              rien à afficher ici plutôt qu&apos;un chiffre inventé.
            </p>
          </Liste>
        </>
      )}

      {onglet === "ensemble" && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <AdminKpiCard label="Inscriptions (30 j)" valeur={String(totalRecruteurs)} aide="prestataires + clients" />
            <AdminKpiCard
              label="Répartition"
              valeur={`${activite30j.nouveauxPrestataires} / ${activite30j.nouveauxClients}`}
              aide="prestataires / clients"
            />
            <AdminKpiCard label="Missions créées (30 j)" valeur={String(activite30j.missionsRealisees)} aide="terminées sur la période" />
            <AdminKpiCard
              label="Conversion candidature → mission"
              valeur={activite30j.tauxConversion !== null ? `${activite30j.tauxConversion}%` : "—"}
              aide="pas de suivi visite → demande"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Liste title="Top villes">
              {topVilles.slice(0, 10).map((v) => (
                <Ligne key={v.ville} label={v.ville} valeur={`${v.nbMissions} missions`} note={`${v.nbPrestataires} prest.`} />
              ))}
              {topVilles.length === 0 && <p className="text-[13px] text-[var(--a-text-3)]">Aucune donnée.</p>}
            </Liste>
            <Liste title={`Missions par statut (${totalMissions}${tauxAnnulation !== null ? ` · ${tauxAnnulation}% annulées` : ""})`}>
              {repartitionStatut.map((s) => (
                <Ligne key={s.statut} label={STATUT_LABEL[s.statut] ?? s.statut} valeur={String(s.nb)} part={totalMissions > 0 ? (s.nb / totalMissions) * 100 : 0} />
              ))}
              {repartitionStatut.length === 0 && <p className="text-[13px] text-[var(--a-text-3)]">Aucune mission pour l&apos;instant.</p>}
            </Liste>
          </div>
        </>
      )}

      {onglet === "historique" && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <AdminKpiCard label="Visiteurs (30 j)" valeur={String(historique.visiteurs30j)} />
            <AdminKpiCard label="Sessions / visiteur" valeur={historique.sessionsParVisiteur !== null ? String(historique.sessionsParVisiteur) : "—"} />
            <AdminKpiCard
              label="Durée moyenne"
              valeur={historique.dureeMoyenneSecondes !== null ? `${Math.floor(historique.dureeMoyenneSecondes / 60)} min ${historique.dureeMoyenneSecondes % 60} s` : "—"}
            />
            <AdminKpiCard label="Rebond" valeur={historique.tauxRebond !== null ? `${historique.tauxRebond}%` : "—"} />
          </div>
          <Liste title="Missions créées par mois (4 derniers mois)">
            {missionsParMoisRecent.map((m) => (
              <Ligne key={m.mois} label={m.mois} valeur={String(m.nb)} />
            ))}
            <p className="pt-1 text-[11px] text-[var(--a-text-3)]">
              Substitué à la « comparaison de périodes » de fréquentation (non mesurée) par un indicateur réel
              équivalent en fond : l&apos;évolution de l&apos;activité mesurée dans le temps.
            </p>
          </Liste>
        </>
      )}
    </div>
  );
}
