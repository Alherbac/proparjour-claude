"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Ban, Unlock, Wrench } from "lucide-react";
import { SidePanel } from "@/components/admin/side-panel";
import { AdminButton } from "@/components/admin/ui/button";
import { AdminTextarea } from "@/components/admin/ui/input";
import { AdminBadge, type AdminBadgeTone } from "@/components/admin/ui/badge";
import { AdminTableShell, AdminTh, AdminTr, AdminTd } from "@/components/admin/ui/table-shell";
import { METIERS } from "@/config/metiers";
import { referenceMission } from "@/lib/admin/reference";
import {
  forcerStatutMission,
  debloquerFondsMission,
  annulerMissionAdmin,
  ouvrirLitigeMissionAdmin,
} from "@/app/actions/admin-missions";
import type { MissionAdminRow } from "@/lib/admin/missions";
import type { MissionStatutType } from "@/lib/supabase/database.types";

const STATUT_INFO: Record<MissionStatutType, { label: string; tone: AdminBadgeTone }> = {
  en_attente: { label: "En attente", tone: "orange" },
  confirmee: { label: "Contractée", tone: "violet" },
  en_cours: { label: "En cours", tone: "orange" },
  terminee: { label: "Terminée", tone: "green" },
  annulee: { label: "Annulée", tone: "grey" },
  litige: { label: "Litige", tone: "red" },
};

const PAIEMENT_INFO: Record<string, { label: string; tone: AdminBadgeTone }> = {
  en_attente: { label: "En attente", tone: "orange" },
  sequestre: { label: "Séquestre", tone: "blue" },
  libere: { label: "Versé", tone: "green" },
  rembourse: { label: "Remboursé", tone: "grey" },
  echec: { label: "Gelé", tone: "red" },
};

const STATUTS_FORCABLES: MissionStatutType[] = ["en_attente", "confirmee", "en_cours", "terminee", "annulee", "litige"];

function nomComplet(p: { prenom: string | null; nom: string | null } | null) {
  if (!p) return "—";
  return [p.prenom, p.nom].filter(Boolean).join(" ") || "—";
}

function MissionPanelContent({ mission }: { mission: MissionAdminRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"statut" | "fonds" | "annuler" | "litige" | null>(null);
  const [nouveauStatut, setNouveauStatut] = useState<MissionStatutType>(mission.statut);
  const [motif, setMotif] = useState("");

  function executer(fn: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Action effectuée.");
      setAction(null);
      setMotif("");
      router.refresh();
    });
  }

  const metier = METIERS.find((m) => mission.lignes.some((l) => l.metier === m.id));

  return (
    <div className="space-y-5">
      <div>
        <AdminBadge tone={STATUT_INFO[mission.statut].tone}>{STATUT_INFO[mission.statut].label}</AdminBadge>
        {mission.motif_litige && (
          <p className="mt-2 flex items-start gap-1.5 text-[13px] text-[var(--a-badge-red-text)]">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {mission.motif_litige}
          </p>
        )}
      </div>

      <div>
        <p className="text-[10.5px] font-bold tracking-[0.12em] text-[var(--a-text-3)] uppercase" style={{ fontFamily: "var(--a-font-display)" }}>Parties prenantes</p>
        <div className="mt-1.5 space-y-1 text-[13px]">
          <p>
            <span className="text-[var(--a-text-2)]">Client : </span>
            {nomComplet(mission.recruteur)}
          </p>
          {mission.lignes.map((ligne) => (
            <p key={ligne.id}>
              <span className="text-[var(--a-text-2)]">Prestataire : </span>
              {nomComplet(ligne.prestataire)}
              {" — "}
              {ligne.heure_debut}–{ligne.heure_fin} · {ligne.tarif_applique} €
            </p>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10.5px] font-bold tracking-[0.12em] text-[var(--a-text-3)] uppercase" style={{ fontFamily: "var(--a-font-display)" }}>Détails</p>
        <div className="mt-1.5 space-y-1 text-[13px]">
          <p><span className="text-[var(--a-text-2)]">Référence : </span>{referenceMission(mission)}</p>
          <p><span className="text-[var(--a-text-2)]">Métier : </span>{metier?.label ?? "—"}</p>
          <p><span className="text-[var(--a-text-2)]">Date : </span>{mission.date_mission}</p>
          <p><span className="text-[var(--a-text-2)]">Lieu : </span>{mission.lieu}</p>
          {mission.description && <p><span className="text-[var(--a-text-2)]">Description : </span>{mission.description}</p>}
        </div>
      </div>

      <div>
        <p className="text-[10.5px] font-bold tracking-[0.12em] text-[var(--a-text-3)] uppercase" style={{ fontFamily: "var(--a-font-display)" }}>Finances</p>
        <div className="mt-1.5 space-y-1 text-[13px]">
          <p><span className="text-[var(--a-text-2)]">Total TTC : </span>{mission.montant_total} €</p>
          {mission.paiement && (
            <>
              <p><span className="text-[var(--a-text-2)]">Commission : </span>{mission.paiement.montant_commission} € ({mission.paiement.taux_commission}%)</p>
              <p className="flex items-center gap-1.5">
                <span className="text-[var(--a-text-2)]">Paiement : </span>
                <AdminBadge tone={PAIEMENT_INFO[mission.paiement.statut]?.tone ?? "grey"}>
                  {PAIEMENT_INFO[mission.paiement.statut]?.label ?? mission.paiement.statut}
                </AdminBadge>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-[var(--a-border)] pt-4">
        <p className="text-[10.5px] font-bold tracking-[0.12em] text-[var(--a-text-3)] uppercase" style={{ fontFamily: "var(--a-font-display)" }}>Actions</p>

        {action === null && (
          <div className="flex flex-wrap gap-2">
            <AdminButton size="sm" variant="secondary" onClick={() => setAction("statut")}>
              <Wrench className="size-3.5" />
              Forcer un statut
            </AdminButton>
            {mission.paiement?.statut === "sequestre" && (
              <AdminButton size="sm" variant="secondary" onClick={() => setAction("fonds")}>
                <Unlock className="size-3.5" />
                Débloquer les fonds
              </AdminButton>
            )}
            {mission.statut !== "annulee" && mission.statut !== "terminee" && (
              <AdminButton size="sm" variant="secondary" onClick={() => setAction("annuler")}>
                <Ban className="size-3.5" />
                Annuler
              </AdminButton>
            )}
            {mission.statut !== "litige" && mission.statut !== "annulee" && (
              <AdminButton size="sm" variant="secondary" onClick={() => setAction("litige")}>
                <AlertTriangle className="size-3.5" />
                Ouvrir un litige
              </AdminButton>
            )}
          </div>
        )}

        {action === "statut" && (
          <div className="space-y-2">
            <select
              value={nouveauStatut}
              onChange={(e) => setNouveauStatut(e.target.value as MissionStatutType)}
              className="h-[38px] w-full rounded-[11px] border border-[var(--a-border-strong)] bg-[var(--a-surface)] px-3 text-[13px]"
            >
              {STATUTS_FORCABLES.map((s) => (
                <option key={s} value={s}>
                  {STATUT_INFO[s].label}
                </option>
              ))}
            </select>
            <AdminTextarea placeholder="Motif (obligatoire)" value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <AdminButton
                size="sm"
                variant="primary"
                disabled={isPending}
                onClick={() => executer(() => forcerStatutMission(mission.id, nouveauStatut, motif))}
              >
                Confirmer
              </AdminButton>
              <AdminButton size="sm" variant="ghost" onClick={() => setAction(null)}>
                Annuler
              </AdminButton>
            </div>
          </div>
        )}

        {(action === "fonds" || action === "annuler" || action === "litige") && (
          <div className="space-y-2">
            <AdminTextarea placeholder="Motif (obligatoire)" value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <AdminButton
                size="sm"
                variant={action === "annuler" ? "danger" : "primary"}
                disabled={isPending}
                onClick={() =>
                  executer(() =>
                    action === "fonds"
                      ? debloquerFondsMission(mission.id, motif)
                      : action === "annuler"
                        ? annulerMissionAdmin(mission.id, motif)
                        : ouvrirLitigeMissionAdmin(mission.id, motif),
                  )
                }
              >
                Confirmer
              </AdminButton>
              <AdminButton size="sm" variant="ghost" onClick={() => setAction(null)}>
                Annuler
              </AdminButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MissionsAdminScreen({ missions }: { missions: MissionAdminRow[] }) {
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const selection = missions.find((m) => m.id === selectionId) ?? null;

  return (
    <>
      <AdminTableShell minWidth={1120}>
        <table className="w-full">
          <thead>
            <tr>
              <AdminTh>Mission</AdminTh>
              <AdminTh>Client</AdminTh>
              <AdminTh>Prestataire</AdminTh>
              <AdminTh>Ville</AdminTh>
              <AdminTh>Dates</AdminTh>
              <AdminTh>Total</AdminTh>
              <AdminTh>Workflow</AdminTh>
              <AdminTh>Paiement</AdminTh>
            </tr>
          </thead>
          <tbody>
            {missions.map((mission) => {
              const metier = METIERS.find((m) => mission.lignes.some((l) => l.metier === m.id));
              return (
                <AdminTr key={mission.id} onClick={() => setSelectionId(mission.id)} active={selectionId === mission.id}>
                  <AdminTd>
                    <p className="font-bold text-[var(--a-ink)]">{metier ? `Mission ${metier.label}` : "Mission"}</p>
                    <p className="text-[11.5px] text-[var(--a-text-3)]">{referenceMission(mission)}</p>
                  </AdminTd>
                  <AdminTd truncate>{nomComplet(mission.recruteur)}</AdminTd>
                  <AdminTd truncate>{mission.lignes.map((l) => nomComplet(l.prestataire)).join(", ") || "—"}</AdminTd>
                  <AdminTd truncate>{mission.lieu}</AdminTd>
                  <AdminTd truncate>{mission.date_mission}</AdminTd>
                  <AdminTd className="a-tabular">{mission.montant_total} €</AdminTd>
                  <AdminTd>
                    <AdminBadge tone={STATUT_INFO[mission.statut].tone}>{STATUT_INFO[mission.statut].label}</AdminBadge>
                  </AdminTd>
                  <AdminTd>
                    {mission.paiement ? (
                      <AdminBadge tone={PAIEMENT_INFO[mission.paiement.statut]?.tone ?? "grey"}>
                        {PAIEMENT_INFO[mission.paiement.statut]?.label ?? mission.paiement.statut}
                      </AdminBadge>
                    ) : (
                      "—"
                    )}
                  </AdminTd>
                </AdminTr>
              );
            })}
          </tbody>
        </table>
      </AdminTableShell>

      <SidePanel titre="Détail de la mission" ouvert={selection !== null} onFermer={() => setSelectionId(null)}>
        {selection && <MissionPanelContent key={selection.id} mission={selection} />}
      </SidePanel>
    </>
  );
}
