import type { RepartitionMetier, RepartitionStatutMission } from "@/lib/admin/statistiques";

const STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
  litige: "Litige",
};

export function StatistiquesScreen({
  repartitionMetier,
  repartitionStatut,
  total,
  tauxAnnulation,
}: {
  repartitionMetier: RepartitionMetier[];
  repartitionStatut: RepartitionStatutMission[];
  total: number;
  tauxAnnulation: number | null;
}) {
  const maxMetier = Math.max(1, ...repartitionMetier.map((m) => Math.max(m.nbPrestataires, m.nbMissions)));
  const maxStatut = Math.max(1, ...repartitionStatut.map((s) => s.nb));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display-serif text-2xl text-foreground">Statistiques</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Répartition de l&apos;activité — pour les chiffres d&apos;activité par période (nouveaux comptes, CA,
          conversion), voir le tableau de bord.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-5">
          <h2 className="text-sm font-semibold text-foreground">Répartition par métier</h2>
          <div className="mt-4 space-y-3">
            {repartitionMetier.map((m) => (
              <div key={m.metier}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{m.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.nbPrestataires} prestataire{m.nbPrestataires > 1 ? "s" : ""} · {m.nbMissions} mission
                    {m.nbMissions > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="mt-1 flex h-2 gap-0.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${(m.nbPrestataires / maxMetier) * 100}%` }} />
                  <div className="h-full bg-amber-400" style={{ width: `${(m.nbMissions / maxMetier) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> Prestataires</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" /> Missions</span>
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Missions par statut</h2>
            {tauxAnnulation !== null && (
              <span className="text-xs text-muted-foreground">Taux d&apos;annulation : {tauxAnnulation}%</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{total} mission{total > 1 ? "s" : ""} au total</p>
          <div className="mt-4 space-y-3">
            {repartitionStatut.map((s) => (
              <div key={s.statut}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{STATUT_LABEL[s.statut] ?? s.statut}</span>
                  <span className="text-xs text-muted-foreground">{s.nb}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${(s.nb / maxStatut) * 100}%` }} />
                </div>
              </div>
            ))}
            {repartitionStatut.length === 0 && <p className="text-sm text-muted-foreground">Aucune mission pour l&apos;instant.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
