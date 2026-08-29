import { AlertCircle } from "lucide-react";
import type { ActivitePlateforme } from "@/lib/admin/dashboard";

function KpiCard({ valeur, label, sousTitre }: { valeur: string; label: string; sousTitre?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <p className="font-display-serif text-2xl text-foreground">{valeur}</p>
      <p className="mt-1 text-sm text-foreground">{label}</p>
      {sousTitre && <p className="mt-0.5 text-xs text-muted-foreground">{sousTitre}</p>}
    </div>
  );
}

export function KpisScreen({
  toutesPeriodes,
  trenteJours,
  tauxAnnulation,
}: {
  toutesPeriodes: ActivitePlateforme;
  trenteJours: ActivitePlateforme;
  tauxAnnulation: number | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display-serif text-2xl text-foreground">KPI stratégiques</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chiffres clés pour orienter les décisions business (cahier des charges §3.10).
        </p>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Depuis le lancement</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard valeur={`${toutesPeriodes.volumeFinancier.toLocaleString("fr-FR")} €`} label="Volume total (GMV)" />
          <KpiCard valeur={String(toutesPeriodes.missionsRealisees)} label="Missions terminées" />
          <KpiCard valeur={tauxAnnulation !== null ? `${tauxAnnulation}%` : "—"} label="Taux d'annulation" />
          <KpiCard
            valeur={toutesPeriodes.tauxConversion !== null ? `${toutesPeriodes.tauxConversion}%` : "—"}
            label="Conversion candidature → mission"
            sousTitre="Candidatures acceptées ÷ candidatures reçues"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">30 derniers jours</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <KpiCard valeur={String(trenteJours.nouveauxPrestataires)} label="Nouveaux prestataires" />
          <KpiCard valeur={String(trenteJours.nouveauxClients)} label="Nouveaux recruteurs" />
          <KpiCard valeur={`${trenteJours.volumeFinancier.toLocaleString("fr-FR")} €`} label="Volume (30j)" />
          <KpiCard valeur={String(trenteJours.missionsRealisees)} label="Missions terminées (30j)" />
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong>Taux de conversion recherche → réservation</strong> (demandé par le cahier des charges §3.10) : non
          disponible. Aucun suivi des recherches effectuées sur la plateforme n&apos;existe dans le schéma actuel —
          l&apos;afficher inventerait un chiffre plutôt que de le laisser absent.
        </p>
      </div>
    </div>
  );
}
