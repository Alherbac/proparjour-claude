"use client";

import { useState } from "react";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminTabs } from "@/components/admin/ui/tabs";
import { AdminKpiCard } from "@/components/admin/ui/kpi-card";
import type {
  EntonnoirEtape,
  InsightsDirection,
  InsightsMetiers,
  InsightsPrestataires,
  InsightsClients,
  InsightsFinances,
  InsightsMarche,
} from "@/lib/admin/insights";

const EUR = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €`;

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

const NON_MESURE = "non mesuré";

export function InsightsScreen({
  entonnoir,
  direction,
  metiers,
  prestataires,
  clients,
  finances,
  marche,
}: {
  entonnoir: EntonnoirEtape[];
  direction: InsightsDirection;
  metiers: { familles: InsightsMetiers; partMultiMetiers: number | null };
  prestataires: InsightsPrestataires;
  clients: InsightsClients;
  finances: InsightsFinances;
  marche: InsightsMarche;
}) {
  const [onglet, setOnglet] = useState<"direction" | "metiers" | "prestataires" | "clients" | "finances" | "marche">("direction");

  return (
    <div className="space-y-5">
      <div>
        <AdminH1>Insights</AdminH1>
        <p className="mt-1 text-[13px] text-[var(--a-text-2)]">
          Chaque tuile documente sa source. Ce qui dépendrait d&apos;un suivi de trafic/recherche (non instrumenté
          dans l&apos;app) est marqué « {NON_MESURE} » plutôt qu&apos;inventé.
        </p>
      </div>

      <AdminTabs
        tabs={[
          { value: "direction", label: "Direction" },
          { value: "metiers", label: "Métiers" },
          { value: "prestataires", label: "Prestataires" },
          { value: "clients", label: "Clients" },
          { value: "finances", label: "Finances" },
          { value: "marche", label: "Marché" },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === "direction" && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <AdminKpiCard label="Croissance nette" valeur={String(direction.croissanceNette)} aide="prestataires inscrits" />
            <AdminKpiCard label="Activation 7 j" valeur={NON_MESURE} aide="pas de cohorte suivie" />
            <AdminKpiCard label="Rétention 90 j" valeur={NON_MESURE} aide="pas de cohorte suivie" />
            <AdminKpiCard label="Ancienneté plateforme" valeur={`${direction.joursDepuisLancement} j`} aide="depuis la 1ère mission" />
          </div>
          <Liste title="Entonnoir de la place de marché">
            {entonnoir.map((e) => (
              <Ligne key={e.label} label={e.label} valeur={String(e.valeur)} note={e.taux !== null ? `${e.taux}%` : "—"} />
            ))}
            {!entonnoir.some((e) => e.label === "Visites") && (
              <p className="pt-1 text-[11px] text-[var(--a-text-3)]">
                Visites et recherches lancées : en attente de la première visite mesurée (tracker posé, migration
                0046) — apparaîtront ici dès qu&apos;un visiteur consentant aura navigué sur le site.
              </p>
            )}
          </Liste>
        </>
      )}

      {onglet === "metiers" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminKpiCard label="Familles actives" valeur={String(metiers.familles.length)} />
            <AdminKpiCard label="Demandes multi-métiers" valeur={metiers.partMultiMetiers !== null ? `${metiers.partMultiMetiers}%` : "—"} aide="missions à plusieurs métiers" />
          </div>
          <Liste title="Part de chaque famille dans les missions">
            {metiers.familles.map((f) => (
              <Ligne key={f.famille} label={f.label} valeur={`${f.partMissions}%`} part={f.partMissions} />
            ))}
          </Liste>
        </>
      )}

      {onglet === "prestataires" && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <AdminKpiCard label="Fiabilité — part « bon »" valeur={prestataires.fiabiliteBonnePart !== null ? `${prestataires.fiabiliteBonnePart}%` : "—"} />
            <AdminKpiCard label="Niveaux Elite" valeur={String(prestataires.niveauxElite)} aide="score bon, accept. ≥ 90%" />
            <AdminKpiCard label="Suspensions automatiques" valeur={String(prestataires.suspensionsAutomatiques)} aide="aucune — toutes manuelles" />
            <AdminKpiCard label="Taux d'annulation" valeur={prestataires.tauxAnnulation !== null ? `${prestataires.tauxAnnulation}%` : "—"} />
          </div>
          <Liste title="Composition du score de fiabilité (méthodologie cible)">
            <Ligne label="Présence effective" valeur="40%" part={40} />
            <Ligne label="Annulations" valeur="30%" part={30} />
            <Ligne label="Incidents signalés" valeur="20%" part={20} />
            <Ligne label="Note client" valeur="10%" part={10} />
            <p className="pt-1 text-[11px] text-[var(--a-text-3)]">
              Pondération cible du cahier des charges — le score composite (0-100) n&apos;est pas encore calculé
              tel quel en base ; les indicateurs ci-dessus utilisent le score bon/à surveiller/élevé déjà réel
              (lib/admin/pilotage.ts).
            </p>
          </Liste>
        </>
      )}

      {onglet === "clients" && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <AdminKpiCard label="Demandes / mois" valeur={String(clients.demandesParMois)} aide="missions créées, 30j" />
            <AdminKpiCard label="Récurrence" valeur={clients.recurrenceMoyenne !== null ? String(clients.recurrenceMoyenne) : "—"} aide="missions par client actif" />
            <AdminKpiCard label="Panier moyen" valeur={EUR(clients.panierMoyen)} />
            <AdminKpiCard label="Part entreprises" valeur={clients.partEntreprises !== null ? `${clients.partEntreprises}%` : "—"} />
          </div>
          <Liste title="Segmentation par volume">
            {clients.segments.map((s) => (
              <Ligne key={s.label} label={s.label} valeur={String(s.nbComptes)} note={`${s.partCa}% du CA`} />
            ))}
          </Liste>
        </>
      )}

      {onglet === "finances" && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <AdminKpiCard label="Chiffre d'affaires" valeur={EUR(finances.ca)} />
            <AdminKpiCard label="Commissions" valeur={EUR(finances.commissions)} aide="missions terminées" />
            <AdminKpiCard label="Marge nette après frais Stripe" valeur={NON_MESURE} aide="frais Stripe non isolés en base" />
            <AdminKpiCard label="Encours de séquestre" valeur={EUR(finances.encoursSequestre)} />
          </div>
          <Liste title="Répartition du chiffre par métier">
            {finances.parMetier.map((m) => (
              <Ligne key={m.label} label={m.label} valeur={EUR(m.montant)} />
            ))}
          </Liste>
        </>
      )}

      {onglet === "marche" && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <AdminKpiCard label="Tension globale" valeur={marche.tensionGlobale !== null ? String(marche.tensionGlobale) : "—"} aide="missions / prestataire" />
            <AdminKpiCard label="Vitesse de matching" valeur={NON_MESURE} aide="1ère réponse non chronométrée" />
            <AdminKpiCard label="Villes couvertes" valeur={String(marche.villesCouvertes)} />
            <AdminKpiCard label="Couverture" valeur={marche.tensionGlobale !== null ? (marche.tensionGlobale <= 1 ? "Équilibrée" : "Tendue") : "—"} />
          </div>
          <Liste title="Zones à recruter en priorité">
            {marche.zonesPrioritaires.map((z) => (
              <Ligne key={z.ville} label={z.ville} valeur={`${z.nbMissions} missions`} note={`${z.nbPrestataires} prest.`} />
            ))}
          </Liste>
        </>
      )}
    </div>
  );
}
