"use client";

import { useState } from "react";
import { SidePanel } from "@/components/admin/side-panel";
import { cn } from "@/lib/utils";
import { METIERS } from "@/config/metiers";
import type {
  PrestataireActif,
  RecruteurActif,
  PrestataireInactif,
  RepartitionVille,
  ScoreRisque,
} from "@/lib/admin/pilotage";

const SCORE_INFO: Record<ScoreRisque, { label: string; classe: string }> = {
  bon: { label: "🟢 Bon", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  surveiller: { label: "🟠 À surveiller", classe: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  eleve: { label: "🔴 Risque élevé", classe: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
};

function nomComplet(p: { prenom: string | null; nom: string | null }) {
  return [p.prenom, p.nom].filter(Boolean).join(" ") || "—";
}

function formatDate(iso: string | null) {
  if (!iso) return "Jamais connecté";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
      <h2 className="font-heading text-lg font-semibold text-foreground">{titre}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
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
      <Section titre="Prestataires les plus actifs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Nom</th>
                <th className="py-2 pr-4 font-medium">Métier</th>
                <th className="py-2 pr-4 font-medium">Dernière connexion</th>
                <th className="py-2 pr-4 font-medium">Missions proposées</th>
                <th className="py-2 pr-4 font-medium">Taux d&apos;acceptation</th>
                <th className="py-2 pr-4 font-medium">Risque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classementPrestataires
                .slice()
                .sort((a, b) => b.nbMissionsProposees - a.nbMissionsProposees)
                .slice(0, 10)
                .map((p) => (
                  <tr key={p.profilId} onClick={() => setSelection({ type: "prestataire", data: p })} className="cursor-pointer hover:bg-secondary/30">
                    <td className="py-2 pr-4 font-medium text-foreground">{nomComplet(p)}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{METIERS.find((m) => m.id === p.metier)?.filiere ?? p.metier}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{formatDate(p.derniereConnexion)}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{p.nbMissionsProposees}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{p.tauxAcceptation !== null ? `${p.tauxAcceptation}%` : "—"}</td>
                    <td className="py-2 pr-4">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", SCORE_INFO[p.score].classe)}>
                        {SCORE_INFO[p.score].label}
                      </span>
                    </td>
                  </tr>
                ))}
              {classementPrestataires.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    Aucun prestataire pour cette période.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section titre="Recruteurs les plus actifs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Nom</th>
                <th className="py-2 pr-4 font-medium">Dernière connexion</th>
                <th className="py-2 pr-4 font-medium">Missions</th>
                <th className="py-2 pr-4 font-medium">Offres publiées</th>
                <th className="py-2 pr-4 font-medium">Panier moyen</th>
                <th className="py-2 pr-4 font-medium">Risque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classementRecruteurs
                .slice()
                .sort((a, b) => b.nbMissionsPubliees + b.nbOffresPubliees - (a.nbMissionsPubliees + a.nbOffresPubliees))
                .slice(0, 10)
                .map((r) => (
                  <tr key={r.userId} onClick={() => setSelection({ type: "recruteur", data: r })} className="cursor-pointer hover:bg-secondary/30">
                    <td className="py-2 pr-4 font-medium text-foreground">{nomComplet(r)}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{formatDate(r.derniereConnexion)}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.nbMissionsPubliees}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.nbOffresPubliees}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.panierMoyen} €</td>
                    <td className="py-2 pr-4">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", SCORE_INFO[r.score].classe)}>
                        {SCORE_INFO[r.score].label}
                      </span>
                    </td>
                  </tr>
                ))}
              {classementRecruteurs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    Aucun recruteur pour cette période.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section titre={`Prestataires inactifs (${inactifs.length})`}>
          {inactifs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun prestataire validé inactif au-delà du seuil.</p>
          ) : (
            <ul className="space-y-2">
              {inactifs.slice(0, 8).map((p) => (
                <li key={p.profilId} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{nomComplet(p)}</span>
                  <span className="text-muted-foreground">
                    {p.joursInactivite !== null ? `${p.joursInactivite} j` : "Jamais connecté"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section titre={`Alertes annulations (${annulationsAlerte.length})`}>
          {annulationsAlerte.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun recruteur au-dessus du seuil d&apos;alerte.</p>
          ) : (
            <ul className="space-y-2">
              {annulationsAlerte.slice(0, 8).map((r) => (
                <li key={r.userId} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{nomComplet(r)}</span>
                  <span className={cn("font-medium", r.nbAnnulations >= 5 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
                    {r.nbAnnulations} annulation{r.nbAnnulations > 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section titre="Répartition géographique des prestataires">
        {repartition.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée.</p>
        ) : (
          <div className="space-y-2">
            {repartition.slice(0, 12).map((v) => (
              <div key={v.ville} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 truncate text-foreground">{v.ville}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(v.nbPrestataires / maxVille) * 100}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-muted-foreground">{v.nbPrestataires}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <SidePanel titre="Fiche de risque" ouvert={selection !== null} onFermer={() => setSelection(null)}>
        {selection?.type === "prestataire" && (
          <div className="space-y-4">
            <p className="font-heading text-lg font-semibold text-foreground">{nomComplet(selection.data)}</p>
            <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", SCORE_INFO[selection.data.score].classe)}>
              {SCORE_INFO[selection.data.score].label}
            </span>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Métier : </span>{METIERS.find((m) => m.id === selection.data.metier)?.label}</p>
              <p><span className="text-muted-foreground">Statut KYC : </span>{selection.data.statutVerification}</p>
              <p><span className="text-muted-foreground">Dernière connexion : </span>{formatDate(selection.data.derniereConnexion)}</p>
              <p><span className="text-muted-foreground">Missions proposées : </span>{selection.data.nbMissionsProposees}</p>
              <p><span className="text-muted-foreground">Taux d&apos;acceptation : </span>{selection.data.tauxAcceptation !== null ? `${selection.data.tauxAcceptation}%` : "—"}</p>
              <p><span className="text-muted-foreground">Litiges : </span>{selection.data.nbLitiges}</p>
            </div>
          </div>
        )}
        {selection?.type === "recruteur" && (
          <div className="space-y-4">
            <p className="font-heading text-lg font-semibold text-foreground">{nomComplet(selection.data)}</p>
            <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", SCORE_INFO[selection.data.score].classe)}>
              {SCORE_INFO[selection.data.score].label}
            </span>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Dernière connexion : </span>{formatDate(selection.data.derniereConnexion)}</p>
              <p><span className="text-muted-foreground">Missions publiées : </span>{selection.data.nbMissionsPubliees}</p>
              <p><span className="text-muted-foreground">Offres publiées : </span>{selection.data.nbOffresPubliees}</p>
              <p><span className="text-muted-foreground">Panier moyen : </span>{selection.data.panierMoyen} €</p>
              <p><span className="text-muted-foreground">Annulations : </span>{selection.data.nbAnnulations}</p>
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
