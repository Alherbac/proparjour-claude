"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminTabs } from "@/components/admin/ui/tabs";
import { AdminKpiCard } from "@/components/admin/ui/kpi-card";
import { AdminBadge, type AdminBadgeTone } from "@/components/admin/ui/badge";
import { AdminButton } from "@/components/admin/ui/button";
import { AdminInput } from "@/components/admin/ui/input";
import { AdminTableShell, AdminTh, AdminTr, AdminTd } from "@/components/admin/ui/table-shell";
import type {
  LigneTauxMetier,
  LigneTauxPrestataireIndividuel,
  LigneTauxSegment,
  LigneTauxClientIndividuel,
} from "@/lib/admin/commissions";
import {
  modifierTauxCommission,
  setTauxMetier,
  retablirTauxMetier,
  setTauxPrestataireIndividuel,
  retablirTauxPrestataireIndividuel,
  setTauxSegment,
  retablirTauxSegment,
  setTauxClientIndividuel,
  retablirTauxClientIndividuel,
  rechercherPrestatairesPourTaux,
  rechercherClientsPourTaux,
} from "@/app/actions/admin-commission";

const SOURCE_INFO: Record<string, { label: string; tone: AdminBadgeTone }> = {
  individuel: { label: "individuel", tone: "violet" },
  groupe: { label: "groupe", tone: "blue" },
  reference: { label: "référence", tone: "grey" },
};

function Stepper({ valeur, onChange, disabled }: { valeur: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.max(0, Math.round((valeur - 0.5) * 10) / 10))}
        className="flex size-10 items-center justify-center rounded-[9px] border border-[var(--a-border-strong)] text-[var(--a-ink)] hover:bg-[var(--a-surface-2)] disabled:opacity-40"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="a-tabular min-w-[62px] text-center text-[19px] font-extrabold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
        {valeur.toFixed(1).replace(".", ",")}%
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.min(40, Math.round((valeur + 0.5) * 10) / 10))}
        className="flex size-10 items-center justify-center rounded-[9px] border border-[var(--a-border-strong)] text-[var(--a-ink)] hover:bg-[var(--a-surface-2)] disabled:opacity-40"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

function Picker({ rechercher, onChoisir }: { rechercher: (q: string) => Promise<{ success: boolean; data?: { id: string; nom: string; sousLabel: string }[] }>; onChoisir: (id: string, nom: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<{ id: string; nom: string; sousLabel: string }[]>([]);

  async function chercher(valeur: string) {
    setQ(valeur);
    const result = await rechercher(valeur);
    if (result.success) setResultats(result.data ?? []);
  }

  if (!ouvert) {
    return (
      <AdminButton size="sm" variant="secondary" onClick={() => setOuvert(true)}>
        Ajouter
      </AdminButton>
    );
  }

  return (
    <div className="relative">
      <AdminInput value={q} onChange={(e) => chercher(e.target.value)} placeholder="Rechercher un nom..." className="w-56" autoFocus />
      {resultats.length > 0 && (
        <div className="absolute top-full right-0 z-10 mt-1 w-64 rounded-[11px] border border-[var(--a-border)] bg-[var(--a-surface)] p-1 shadow-lg">
          {resultats.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onChoisir(r.id, r.nom);
                setOuvert(false);
                setQ("");
                setResultats([]);
              }}
              className="flex w-full items-center justify-between rounded-[8px] px-2.5 py-2 text-left text-[12.5px] hover:bg-[var(--a-surface-2)]"
            >
              <span className="font-medium text-[var(--a-ink)]">{r.nom}</span>
              <span className="text-[11px] text-[var(--a-text-3)]">{r.sousLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CotePrestataires({
  tauxMetier,
  individuels,
  missions,
}: {
  tauxMetier: { lignes: LigneTauxMetier[]; reference: number; plageMin: number; plageMax: number };
  individuels: LigneTauxPrestataireIndividuel[];
  missions: Awaited<ReturnType<typeof import("@/lib/admin/commissions").getMissionsAvecCommissionPrestataire>>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nouveau, setNouveau] = useState<{ id: string; nom: string; taux: number } | null>(null);

  function appliquer(fn: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-[15px] border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--a-text-2)] uppercase" style={{ fontFamily: "var(--a-font-display)" }}>Taux de référence</p>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="a-tabular text-[23px] font-extrabold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>{tauxMetier.reference}%</span>
            <Stepper valeur={tauxMetier.reference} disabled={isPending} onChange={(v) => appliquer(() => modifierTauxCommission(v))} />
          </div>
        </div>
        <AdminKpiCard label="Plage par métier" valeur={`${tauxMetier.plageMin}–${tauxMetier.plageMax}%`} />
        <AdminKpiCard label="Taux individuels" valeur={String(individuels.length)} aide="prestataires concernés" />
        <AdminKpiCard label="Commissions du mois" valeur="voir Finances" aide="détail dans Insights" />
      </div>

      <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
        <h2 className="mb-3 text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>Taux par métier</h2>
        <div className="space-y-3">
          {tauxMetier.lignes.map((l) => (
            <div key={l.metier} className="flex flex-wrap items-center gap-3">
              <span className={`size-2 shrink-0 rounded-full ${l.couleur}`} />
              <span className="min-w-[140px] flex-1 text-[13px] font-semibold text-[var(--a-ink)]">{l.label}</span>
              <span className="shrink-0 text-[12px] text-[var(--a-text-3)]">{l.nbPrestataires} prestataires</span>
              <Stepper valeur={l.taux} disabled={isPending} onChange={(v) => appliquer(() => setTauxMetier(l.metier, v))} />
              <AdminBadge tone={SOURCE_INFO[l.source].tone}>{l.source === "reference" ? "Taux de référence" : "Taux propre au métier"}</AdminBadge>
              {l.source === "groupe" && (
                <AdminButton size="sm" variant="ghost" disabled={isPending} onClick={() => appliquer(() => retablirTauxMetier(l.metier))}>
                  Rétablir
                </AdminButton>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>Taux individuels</h2>
          <Picker rechercher={rechercherPrestatairesPourTaux} onChoisir={(id, nom) => setNouveau({ id, nom, taux: tauxMetier.reference })} />
        </div>
        {nouveau && (
          <div className="mb-3 flex items-center gap-3 rounded-[11px] border border-[var(--a-border)] p-3">
            <span className="flex-1 text-[13px] font-semibold text-[var(--a-ink)]">{nouveau.nom}</span>
            <Stepper valeur={nouveau.taux} onChange={(v) => setNouveau({ ...nouveau, taux: v })} />
            <AdminButton size="sm" variant="primary" onClick={() => { appliquer(() => setTauxPrestataireIndividuel(nouveau.id, nouveau.taux)); setNouveau(null); }}>
              Enregistrer
            </AdminButton>
          </div>
        )}
        <div className="space-y-2.5">
          {individuels.map((l) => {
            const diff = Math.round((l.tauxIndividuel! - l.tauxMetierOuReference) * 10) / 10;
            return (
              <div key={l.prestataireId} className="flex flex-wrap items-center gap-3">
                <span className="min-w-[140px] flex-1 text-[13px] font-semibold text-[var(--a-ink)]">{l.nom}</span>
                <span className="shrink-0 text-[12px] text-[var(--a-text-3)]">{l.metier} · {l.nbMissions} missions</span>
                <Stepper valeur={l.tauxIndividuel!} disabled={isPending} onChange={(v) => appliquer(() => setTauxPrestataireIndividuel(l.prestataireId, v))} />
                <AdminBadge tone={diff === 0 ? "grey" : diff < 0 ? "green" : "orange"}>
                  {diff === 0 ? "Aligné sur le métier" : diff < 0 ? `Remise de ${Math.abs(diff)} pt` : `Majoré de ${diff} pt`}
                </AdminBadge>
                <AdminButton size="sm" variant="ghost" disabled={isPending} onClick={() => appliquer(() => retablirTauxPrestataireIndividuel(l.prestataireId))}>
                  Rétablir
                </AdminButton>
              </div>
            );
          })}
          {individuels.length === 0 && <p className="text-[13px] text-[var(--a-text-3)]">Aucun taux individuel configuré.</p>}
        </div>
      </div>

      <AdminTableShell minWidth={1000}>
        <table className="w-full">
          <thead>
            <tr>
              <AdminTh>Mission</AdminTh>
              <AdminTh>Prestataire</AdminTh>
              <AdminTh>Total TTC</AdminTh>
              <AdminTh>Net prestataire</AdminTh>
              <AdminTh>Taux</AdminTh>
              <AdminTh>Commission</AdminTh>
              <AdminTh>Versement</AdminTh>
            </tr>
          </thead>
          <tbody>
            {missions.map((m) => (
              <AdminTr key={m.missionId}>
                <AdminTd truncate>{m.dateMission} · {m.lieu}</AdminTd>
                <AdminTd truncate>
                  <p className="font-bold text-[var(--a-ink)]">{m.prestataire}</p>
                  <p className="text-[11.5px] text-[var(--a-text-3)]">{m.metier}</p>
                </AdminTd>
                <AdminTd className="a-tabular">{m.totalTtc} €</AdminTd>
                <AdminTd className="a-tabular">{m.netPrestataire} €</AdminTd>
                <AdminTd>
                  <AdminBadge tone={SOURCE_INFO[m.sourceActuelle].tone}>{m.tauxApplique}% · {SOURCE_INFO[m.sourceActuelle].label}</AdminBadge>
                </AdminTd>
                <AdminTd className="a-tabular">
                  <span style={{ color: "var(--a-badge-red-text)" }}>{m.commission} €</span>
                </AdminTd>
                <AdminTd>
                  <AdminBadge tone={m.versement === "libere" ? "green" : m.versement === "sequestre" ? "blue" : "orange"}>{m.versement}</AdminBadge>
                </AdminTd>
              </AdminTr>
            ))}
            {missions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-[var(--a-text-3)]">Aucune mission pour l&apos;instant.</td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminTableShell>
      <p className="text-[11px] text-[var(--a-text-3)]">
        Le taux prestataire est prélevé sur le net versé, et une modification ne s&apos;applique jamais
        rétroactivement aux missions déjà contractées. La colonne « Taux » montre le taux réellement facturé à la
        mission ; le badge de source reflète la configuration actuelle, qui peut avoir changé depuis.
      </p>
    </div>
  );
}

function CoteClients({
  tauxSegment,
  individuels,
  missions,
}: {
  tauxSegment: { lignes: LigneTauxSegment[]; reference: number };
  individuels: LigneTauxClientIndividuel[];
  missions: Awaited<ReturnType<typeof import("@/lib/admin/commissions").getMissionsAvecFraisClient>>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nouveau, setNouveau] = useState<{ id: string; nom: string; taux: number } | null>(null);
  const taux = tauxSegment.lignes.map((l) => l.taux);

  function appliquer(fn: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) toast.error(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border p-3.5 text-[12.5px]" style={{ background: "var(--a-badge-orange-bg)", borderColor: "var(--a-badge-orange-border)", color: "var(--a-badge-orange-text)" }}>
        Configuration réelle et persistée — <strong>non câblée</strong> dans le calcul du montant facturé au client
        (aucun frais de service n&apos;existe encore dans le tunnel de paiement). Voir le rapport de livraison
        avant d&apos;activer ces taux en production.
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <AdminKpiCard label="Taux de référence" valeur={`${tauxSegment.reference}%`} />
        <AdminKpiCard label="Plage par segment" valeur={`${Math.min(...taux, tauxSegment.reference)}–${Math.max(...taux, tauxSegment.reference)}%`} />
        <AdminKpiCard label="Taux individuels" valeur={String(individuels.length)} aide="clients concernés" />
        <AdminKpiCard label="Frais de service du mois" valeur="0 €" aide="non facturé — voir note ci-dessus" />
      </div>

      <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
        <h2 className="mb-3 text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>Taux par segment client</h2>
        <div className="space-y-3">
          {tauxSegment.lignes.map((l) => (
            <div key={l.segment} className="flex flex-wrap items-center gap-3">
              <span className="size-2 shrink-0 rounded-full" style={{ background: "var(--a-blue)" }} />
              <span className="min-w-[180px] flex-1 text-[13px] font-semibold text-[var(--a-ink)]">{l.label}</span>
              <span className="shrink-0 text-[12px] text-[var(--a-text-3)]">{l.nbComptes} comptes · {l.critere}</span>
              <Stepper valeur={l.taux} disabled={isPending} onChange={(v) => appliquer(() => setTauxSegment(l.segment, v))} />
              <AdminBadge tone={SOURCE_INFO[l.source].tone}>{l.source === "reference" ? "Taux de référence" : "Taux propre au segment"}</AdminBadge>
              {l.source === "groupe" && (
                <AdminButton size="sm" variant="ghost" disabled={isPending} onClick={() => appliquer(() => retablirTauxSegment(l.segment))}>
                  Rétablir
                </AdminButton>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>Taux individuels</h2>
          <Picker rechercher={rechercherClientsPourTaux} onChoisir={(id, nom) => setNouveau({ id, nom, taux: tauxSegment.reference })} />
        </div>
        {nouveau && (
          <div className="mb-3 flex items-center gap-3 rounded-[11px] border border-[var(--a-border)] p-3">
            <span className="flex-1 text-[13px] font-semibold text-[var(--a-ink)]">{nouveau.nom}</span>
            <Stepper valeur={nouveau.taux} onChange={(v) => setNouveau({ ...nouveau, taux: v })} />
            <AdminButton size="sm" variant="primary" onClick={() => { appliquer(() => setTauxClientIndividuel(nouveau.id, nouveau.taux)); setNouveau(null); }}>
              Enregistrer
            </AdminButton>
          </div>
        )}
        <div className="space-y-2.5">
          {individuels.map((l) => {
            const diff = Math.round((l.tauxIndividuel - l.tauxSegmentOuReference) * 10) / 10;
            return (
              <div key={l.recruteurId} className="flex flex-wrap items-center gap-3">
                <span className="min-w-[140px] flex-1 text-[13px] font-semibold text-[var(--a-ink)]">{l.nom}</span>
                <span className="shrink-0 text-[12px] text-[var(--a-text-3)]">{l.segment} · {l.nbMissions} missions</span>
                <Stepper valeur={l.tauxIndividuel} disabled={isPending} onChange={(v) => appliquer(() => setTauxClientIndividuel(l.recruteurId, v))} />
                <AdminBadge tone={diff === 0 ? "grey" : diff < 0 ? "green" : "orange"}>
                  {diff === 0 ? "Aligné sur le segment" : diff < 0 ? `Remise de ${Math.abs(diff)} pt` : `Majoré de ${diff} pt`}
                </AdminBadge>
                <AdminButton size="sm" variant="ghost" disabled={isPending} onClick={() => appliquer(() => retablirTauxClientIndividuel(l.recruteurId))}>
                  Rétablir
                </AdminButton>
              </div>
            );
          })}
          {individuels.length === 0 && <p className="text-[13px] text-[var(--a-text-3)]">Aucun taux individuel configuré.</p>}
        </div>
      </div>

      <AdminTableShell minWidth={1000}>
        <table className="w-full">
          <thead>
            <tr>
              <AdminTh>Mission</AdminTh>
              <AdminTh>Client</AdminTh>
              <AdminTh>Prestation</AdminTh>
              <AdminTh>Total facturé</AdminTh>
              <AdminTh>Taux</AdminTh>
              <AdminTh>Frais de service</AdminTh>
              <AdminTh>Facturation</AdminTh>
            </tr>
          </thead>
          <tbody>
            {missions.map((m) => (
              <AdminTr key={m.missionId}>
                <AdminTd truncate>{m.dateMission} · {m.lieu}</AdminTd>
                <AdminTd truncate>
                  <p className="font-bold text-[var(--a-ink)]">{m.client}</p>
                  <p className="text-[11.5px] text-[var(--a-text-3)]">{m.segment}</p>
                </AdminTd>
                <AdminTd className="a-tabular">{m.prestation} €</AdminTd>
                <AdminTd className="a-tabular">{m.totalFacture} €</AdminTd>
                <AdminTd>
                  <AdminBadge tone={SOURCE_INFO[m.source].tone}>{m.taux}% · {SOURCE_INFO[m.source].label}</AdminBadge>
                </AdminTd>
                <AdminTd className="a-tabular">{m.frais} €</AdminTd>
                <AdminTd>
                  {m.facturation ? (
                    <AdminBadge tone={m.facturation === "libere" ? "green" : m.facturation === "sequestre" ? "orange" : "grey"}>{m.facturation}</AdminBadge>
                  ) : (
                    "—"
                  )}
                </AdminTd>
              </AdminTr>
            ))}
            {missions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[13px] text-[var(--a-text-3)]">Aucune mission pour l&apos;instant.</td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminTableShell>
      <p className="text-[11px] text-[var(--a-text-3)]">
        Les frais client s&apos;ajoutent au montant de la prestation (l&apos;inverse du côté prestataire, où la
        commission est prélevée) et apparaîtraient en ligne distincte sur la facture, une fois câblés.
      </p>
    </div>
  );
}

export function CommissionsScreen({
  tauxMetier,
  individuelsPrestataires,
  missionsPrestataires,
  tauxSegment,
  individuelsClients,
  missionsClients,
}: {
  tauxMetier: { lignes: LigneTauxMetier[]; reference: number; plageMin: number; plageMax: number };
  individuelsPrestataires: LigneTauxPrestataireIndividuel[];
  missionsPrestataires: Awaited<ReturnType<typeof import("@/lib/admin/commissions").getMissionsAvecCommissionPrestataire>>;
  tauxSegment: { lignes: LigneTauxSegment[]; reference: number };
  individuelsClients: LigneTauxClientIndividuel[];
  missionsClients: Awaited<ReturnType<typeof import("@/lib/admin/commissions").getMissionsAvecFraisClient>>;
}) {
  const [onglet, setOnglet] = useState<"prestataires" | "clients">("prestataires");

  return (
    <div className="space-y-5">
      <div>
        <AdminH1>Commissions</AdminH1>
        <p className="mt-1 max-w-2xl text-[13px] text-[var(--a-text-2)]">
          Un taux de référence pour la plateforme, un taux de groupe qui le remplace, et un taux individuel qui
          remplace les deux. Aucune modification ne s&apos;applique rétroactivement aux missions déjà contractées.
        </p>
      </div>

      <AdminTabs
        tabs={[
          { value: "prestataires", label: "Côté prestataires" },
          { value: "clients", label: "Côté clients" },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === "prestataires" ? (
        <CotePrestataires tauxMetier={tauxMetier} individuels={individuelsPrestataires} missions={missionsPrestataires} />
      ) : (
        <CoteClients tauxSegment={tauxSegment} individuels={individuelsClients} missions={missionsClients} />
      )}
    </div>
  );
}
