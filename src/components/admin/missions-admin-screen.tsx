"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Ban, Unlock, Wrench } from "lucide-react";
import { SidePanel } from "@/components/admin/side-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { METIERS } from "@/config/metiers";
import {
  forcerStatutMission,
  debloquerFondsMission,
  annulerMissionAdmin,
  ouvrirLitigeMissionAdmin,
} from "@/app/actions/admin-missions";
import type { MissionAdminRow } from "@/lib/admin/missions";
import type { MissionStatutType } from "@/lib/supabase/database.types";

const STATUT_INFO: Record<MissionStatutType, { label: string; classe: string }> = {
  en_attente: { label: "🟠 En attente", classe: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  confirmee: { label: "🟢 Confirmée", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  en_cours: { label: "🟢 En cours", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  terminee: { label: "🟢 Terminée", classe: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  annulee: { label: "Annulée", classe: "bg-secondary text-muted-foreground" },
  litige: { label: "🔴 Litige", classe: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
};

const PAIEMENT_LABEL: Record<string, string> = {
  en_attente: "En attente",
  sequestre: "🟠 Séquestré",
  libere: "🟢 Libéré",
  rembourse: "Remboursé",
  echec: "🔴 Échec",
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
        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", STATUT_INFO[mission.statut].classe)}>
          {STATUT_INFO[mission.statut].label}
        </span>
        {mission.motif_litige && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {mission.motif_litige}
          </p>
        )}
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Parties prenantes</p>
        <div className="mt-1.5 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Client : </span>
            {nomComplet(mission.recruteur)}
          </p>
          {mission.lignes.map((ligne) => (
            <p key={ligne.id}>
              <span className="text-muted-foreground">Prestataire : </span>
              {nomComplet(ligne.prestataire)}
              {" — "}
              {ligne.heure_debut}–{ligne.heure_fin} · {ligne.tarif_applique} €
            </p>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Détails</p>
        <div className="mt-1.5 space-y-1 text-sm">
          <p><span className="text-muted-foreground">Métier : </span>{metier?.label ?? "—"}</p>
          <p><span className="text-muted-foreground">Date : </span>{mission.date_mission}</p>
          <p><span className="text-muted-foreground">Lieu : </span>{mission.lieu}</p>
          {mission.description && <p><span className="text-muted-foreground">Description : </span>{mission.description}</p>}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Finances</p>
        <div className="mt-1.5 space-y-1 text-sm">
          <p><span className="text-muted-foreground">Total TTC : </span>{mission.montant_total} €</p>
          {mission.paiement && (
            <>
              <p><span className="text-muted-foreground">Commission : </span>{mission.paiement.montant_commission} € ({mission.paiement.taux_commission}%)</p>
              <p>
                <span className="text-muted-foreground">Séquestre : </span>
                {PAIEMENT_LABEL[mission.paiement.statut] ?? mission.paiement.statut}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</p>

        {action === null && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setAction("statut")}>
              <Wrench className="size-3.5" />
              Forcer un statut
            </Button>
            {mission.paiement?.statut === "sequestre" && (
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setAction("fonds")}>
                <Unlock className="size-3.5" />
                Débloquer les fonds
              </Button>
            )}
            {mission.statut !== "annulee" && mission.statut !== "terminee" && (
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setAction("annuler")}>
                <Ban className="size-3.5" />
                Annuler
              </Button>
            )}
            {mission.statut !== "litige" && mission.statut !== "annulee" && (
              <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => setAction("litige")}>
                <AlertTriangle className="size-3.5" />
                Ouvrir un litige
              </Button>
            )}
          </div>
        )}

        {action === "statut" && (
          <div className="space-y-2">
            <select
              value={nouveauStatut}
              onChange={(e) => setNouveauStatut(e.target.value as MissionStatutType)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {STATUTS_FORCABLES.map((s) => (
                <option key={s} value={s}>
                  {STATUT_INFO[s].label.replace(/^[🟠🟢🔴]\s/, "")}
                </option>
              ))}
            </select>
            <Textarea placeholder="Motif (obligatoire)" value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => executer(() => forcerStatutMission(mission.id, nouveauStatut, motif))}
                className="rounded-full"
              >
                Confirmer
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAction(null)}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        {(action === "fonds" || action === "annuler" || action === "litige") && (
          <div className="space-y-2">
            <Textarea placeholder="Motif (obligatoire)" value={motif} onChange={(e) => setMotif(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={action === "annuler" ? "destructive" : "default"}
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
                className="rounded-full"
              >
                Confirmer
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAction(null)}>
                Annuler
              </Button>
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
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Prestataire(s)</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Lieu</th>
              <th className="px-4 py-3 font-medium">Montant</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {missions.map((mission) => (
              <tr
                key={mission.id}
                onClick={() => setSelectionId(mission.id)}
                className="cursor-pointer hover:bg-secondary/30"
              >
                <td className="px-4 py-3 font-medium text-foreground">{nomComplet(mission.recruteur)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {mission.lignes.map((l) => nomComplet(l.prestataire)).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{mission.date_mission}</td>
                <td className="px-4 py-3 text-muted-foreground">{mission.lieu}</td>
                <td className="px-4 py-3 text-muted-foreground">{mission.montant_total} €</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", STATUT_INFO[mission.statut].classe)}>
                    {STATUT_INFO[mission.statut].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SidePanel titre="Détail de la mission" ouvert={selection !== null} onFermer={() => setSelectionId(null)}>
        {selection && <MissionPanelContent key={selection.id} mission={selection} />}
      </SidePanel>
    </>
  );
}
