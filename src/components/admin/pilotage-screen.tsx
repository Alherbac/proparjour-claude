"use client";

import { useState } from "react";
import { SidePanel } from "@/components/admin/side-panel";
import { AdminSection } from "@/components/admin/ui/section";
import { AdminBadge, type AdminBadgeTone } from "@/components/admin/ui/badge";
import { AdminTableShell, AdminTh, AdminTr, AdminTd } from "@/components/admin/ui/table-shell";
import { cn } from "@/lib/utils";
import { METIERS } from "@/config/metiers";
import type {
  PrestataireActif,
  RecruteurActif,
  PrestataireInactif,
  RepartitionVille,
  ScoreRisque,
} from "@/lib/admin/pilotage";

const SCORE_INFO: Record<ScoreRisque, { label: string; tone: AdminBadgeTone }> = {
  bon: { label: "Bon", tone: "green" },
  surveiller: { label: "À surveiller", tone: "orange" },
  eleve: { label: "Risque élevé", tone: "red" },
};

function nomComplet(p: { prenom: string | null; nom: string | null }) {
  return [p.prenom, p.nom].filter(Boolean).join(" ") || "—";
}

function formatDate(iso: string | null) {
  if (!iso) return "Jamais connecté";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type SelectionRisque =
  | { type: "prestataire"; data: PrestataireActif }
  | { type: "recruteur"; data: RecruteurActif };

export function PilotageScreen({
  classementPrestataires,
  classementRecruteurs,
  inactifs,
  repartition,
}: {
  classementPrestataires: PrestataireActif[];
  classementRecruteurs: RecruteurActif[];
  inactifs: PrestataireInactif[];
  repartition: RepartitionVille[];
}) {
  const [selection, setSelection] = useState<SelectionRisque | null>(null);

  const annulationsAlerte = classementRecruteurs.filter((r) => r.nbAnnulations >= 2).sort((a, b) => b.nbAnnulations - a.nbAnnulations);
  const maxVille = Math.max(1, ...repartition.map((v) => v.nbPrestataires));

  return (
    <div className="space-y-4">
      <AdminSection title="Prestataires les plus actifs">
        <AdminTableShell minWidth={860}>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr>
                <AdminTh>Nom</AdminTh>
                <AdminTh>Métier</AdminTh>
                <AdminTh>Dernière connexion</AdminTh>
                <AdminTh>Missions proposées</AdminTh>
                <AdminTh>Taux d&apos;acceptation</AdminTh>
                <AdminTh>Risque</AdminTh>
              </tr>
            </thead>
            <tbody>
              {classementPrestataires
                .slice()
                .sort((a, b) => b.nbMissionsProposees - a.nbMissionsProposees)
                .slice(0, 10)
                .map((p) => (
                  <AdminTr key={p.profilId} onClick={() => setSelection({ type: "prestataire", data: p })}>
                    <AdminTd className="font-semibold">{nomComplet(p)}</AdminTd>
                    <AdminTd>{METIERS.find((m) => m.id === p.metier)?.filiere ?? p.metier}</AdminTd>
                    <AdminTd>{formatDate(p.derniereConnexion)}</AdminTd>
                    <AdminTd>{p.nbMissionsProposees}</AdminTd>
                    <AdminTd>{p.tauxAcceptation !== null ? `${p.tauxAcceptation}%` : "—"}</AdminTd>
                    <AdminTd>
                      <AdminBadge tone={SCORE_INFO[p.score].tone}>{SCORE_INFO[p.score].label}</AdminBadge>
                    </AdminTd>
                  </AdminTr>
                ))}
              {classementPrestataires.length === 0 && (
                <tr>
                  <AdminTd className="py-4 text-center text-[var(--a-text-3)]">
                    Aucun prestataire pour cette période.
                  </AdminTd>
                </tr>
              )}
            </tbody>
          </table>
        </AdminTableShell>
      </AdminSection>

      <AdminSection title="Recruteurs les plus actifs">
        <AdminTableShell minWidth={860}>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr>
                <AdminTh>Nom</AdminTh>
                <AdminTh>Dernière connexion</AdminTh>
                <AdminTh>Missions</AdminTh>
                <AdminTh>Offres publiées</AdminTh>
                <AdminTh>Panier moyen</AdminTh>
                <AdminTh>Risque</AdminTh>
              </tr>
            </thead>
            <tbody>
              {classementRecruteurs
                .slice()
                .sort((a, b) => b.nbMissionsPubliees + b.nbOffresPubliees - (a.nbMissionsPubliees + a.nbOffresPubliees))
                .slice(0, 10)
                .map((r) => (
                  <AdminTr key={r.userId} onClick={() => setSelection({ type: "recruteur", data: r })}>
                    <AdminTd className="font-semibold">{nomComplet(r)}</AdminTd>
                    <AdminTd>{formatDate(r.derniereConnexion)}</AdminTd>
                    <AdminTd>{r.nbMissionsPubliees}</AdminTd>
                    <AdminTd>{r.nbOffresPubliees}</AdminTd>
                    <AdminTd>{r.panierMoyen} €</AdminTd>
                    <AdminTd>
                      <AdminBadge tone={SCORE_INFO[r.score].tone}>{SCORE_INFO[r.score].label}</AdminBadge>
                    </AdminTd>
                  </AdminTr>
                ))}
              {classementRecruteurs.length === 0 && (
                <tr>
                  <AdminTd className="py-4 text-center text-[var(--a-text-3)]">
                    Aucun recruteur pour cette période.
                  </AdminTd>
                </tr>
              )}
            </tbody>
          </table>
        </AdminTableShell>
      </AdminSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSection title={`Prestataires inactifs (${inactifs.length})`}>
          {inactifs.length === 0 ? (
            <p className="text-[13px] text-[var(--a-text-3)]">Aucun prestataire validé inactif au-delà du seuil.</p>
          ) : (
            <ul className="space-y-2">
              {inactifs.slice(0, 8).map((p) => (
                <li key={p.profilId} className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[var(--a-ink)]">{nomComplet(p)}</span>
                  <span className="text-[var(--a-text-2)]">
                    {p.joursInactivite !== null ? `${p.joursInactivite} j` : "Jamais connecté"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection title={`Alertes annulations (${annulationsAlerte.length})`}>
          {annulationsAlerte.length === 0 ? (
            <p className="text-[13px] text-[var(--a-text-3)]">Aucun recruteur au-dessus du seuil d&apos;alerte.</p>
          ) : (
            <ul className="space-y-2">
              {annulationsAlerte.slice(0, 8).map((r) => (
                <li key={r.userId} className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-[var(--a-ink)]">{nomComplet(r)}</span>
                  <span
                    className="font-semibold"
                    style={{ color: r.nbAnnulations >= 5 ? "var(--a-badge-red-text)" : "var(--a-badge-orange-text)" }}
                  >
                    {r.nbAnnulations} annulation{r.nbAnnulations > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>

      <AdminSection title="Répartition géographique des prestataires">
        {repartition.length === 0 ? (
          <p className="text-[13px] text-[var(--a-text-3)]">Aucune donnée.</p>
        ) : (
          <div className="space-y-2">
            {repartition.slice(0, 12).map((v) => (
              <div key={v.ville} className="flex items-center gap-3 text-[13px]">
                <span className="w-32 shrink-0 truncate text-[var(--a-ink)]">{v.ville}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--a-surface-2)]">
                  <div className="h-full rounded-full" style={{ width: `${(v.nbPrestataires / maxVille) * 100}%`, backgroundColor: "var(--a-accent)" }} />
                </div>
                <span className="w-8 shrink-0 text-right text-[var(--a-text-2)]">{v.nbPrestataires}</span>
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <SidePanel titre="Fiche de risque" ouvert={selection !== null} onFermer={() => setSelection(null)}>
        {selection?.type === "prestataire" && (
          <div className="space-y-4">
            <p className="text-[16px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
              {nomComplet(selection.data)}
            </p>
            <AdminBadge tone={SCORE_INFO[selection.data.score].tone}>{SCORE_INFO[selection.data.score].label}</AdminBadge>
            <div className={cn("space-y-1 text-[13px]")}>
              <p><span className="text-[var(--a-text-2)]">Métier : </span>{METIERS.find((m) => m.id === selection.data.metier)?.label}</p>
              <p><span className="text-[var(--a-text-2)]">Statut KYC : </span>{selection.data.statutVerification}</p>
              <p><span className="text-[var(--a-text-2)]">Dernière connexion : </span>{formatDate(selection.data.derniereConnexion)}</p>
              <p><span className="text-[var(--a-text-2)]">Missions proposées : </span>{selection.data.nbMissionsProposees}</p>
              <p><span className="text-[var(--a-text-2)]">Taux d&apos;acceptation : </span>{selection.data.tauxAcceptation !== null ? `${selection.data.tauxAcceptation}%` : "—"}</p>
              <p><span className="text-[var(--a-text-2)]">Litiges : </span>{selection.data.nbLitiges}</p>
            </div>
          </div>
        )}
        {selection?.type === "recruteur" && (
          <div className="space-y-4">
            <p className="text-[16px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
              {nomComplet(selection.data)}
            </p>
            <AdminBadge tone={SCORE_INFO[selection.data.score].tone}>{SCORE_INFO[selection.data.score].label}</AdminBadge>
            <div className="space-y-1 text-[13px]">
              <p><span className="text-[var(--a-text-2)]">Dernière connexion : </span>{formatDate(selection.data.derniereConnexion)}</p>
              <p><span className="text-[var(--a-text-2)]">Missions publiées : </span>{selection.data.nbMissionsPubliees}</p>
              <p><span className="text-[var(--a-text-2)]">Offres publiées : </span>{selection.data.nbOffresPubliees}</p>
              <p><span className="text-[var(--a-text-2)]">Panier moyen : </span>{selection.data.panierMoyen} €</p>
              <p><span className="text-[var(--a-text-2)]">Annulations : </span>{selection.data.nbAnnulations}</p>
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
