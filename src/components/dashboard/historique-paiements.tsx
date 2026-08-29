import Link from "next/link";
import { FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MissionAvecLignes } from "@/lib/missions";

const STATUT_PAIEMENT_LABEL: Record<string, { label: string; style: string }> = {
  en_attente: { label: "En attente", style: "bg-secondary text-secondary-foreground" },
  sequestre: { label: "Séquestré", style: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  libere: { label: "Payé", style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  rembourse: { label: "Remboursé", style: "bg-secondary text-secondary-foreground" },
  echec: { label: "Échec", style: "bg-destructive/10 text-destructive" },
};

const STATUTS_FACTURABLES = ["sequestre", "libere", "rembourse"];

export function HistoriquePaiements({ missions }: { missions: MissionAvecLignes[] }) {
  const avecPaiement = missions.filter((m) => m.paiement !== null);

  if (avecPaiement.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun paiement pour l&apos;instant.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">Date</th>
            <th className="pb-2 font-medium">Lieu</th>
            <th className="pb-2 font-medium">Montant</th>
            <th className="pb-2 font-medium">Statut</th>
            <th className="pb-2 font-medium">Facture</th>
          </tr>
        </thead>
        <tbody>
          {avecPaiement.map((mission) => {
            const statut = mission.paiement ? STATUT_PAIEMENT_LABEL[mission.paiement.statut] : null;
            return (
              <tr key={mission.id} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 text-foreground">{mission.date_mission}</td>
                <td className="py-2.5 text-muted-foreground">{mission.lieu}</td>
                <td className="py-2.5 text-foreground">{mission.montant_total} €</td>
                <td className="py-2.5">
                  {statut && (
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statut.style)}>
                      {statut.label}
                    </span>
                  )}
                </td>
                <td className="py-2.5">
                  {mission.paiement && STATUTS_FACTURABLES.includes(mission.paiement.statut) && (
                    <Link
                      href={`/api/factures/${mission.id}`}
                      className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                    >
                      <FileDown className="size-3.5" />
                      Voir
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
