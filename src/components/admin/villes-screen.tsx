import { MapPin } from "lucide-react";
import type { VilleOffreDemande } from "@/lib/admin/pilotage";

export function VillesScreen({ villes }: { villes: VilleOffreDemande[] }) {
  const maxValeur = Math.max(1, ...villes.map((v) => Math.max(v.nbPrestataires, v.nbMissions)));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display-serif text-2xl text-foreground">Villes / zones</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          La zone de couverture n&apos;est pas une liste figée à gérer ici : l&apos;autocomplete adresse
          interroge en direct l&apos;API officielle geo.api.gouv.fr sur l&apos;ensemble de la région
          Île-de-France, toujours à jour. Cet écran montre à la place l&apos;offre (prestataires) et la
          demande (missions) réelles par ville, pour repérer les zones à prioriser côté recrutement.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Ville</th>
              <th className="px-4 py-2.5 font-medium">Prestataires</th>
              <th className="px-4 py-2.5 font-medium">Missions</th>
              <th className="px-4 py-2.5 font-medium">Répartition</th>
            </tr>
          </thead>
          <tbody>
            {villes.map((v) => (
              <tr key={v.ville} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5 font-medium text-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                    {v.ville}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{v.nbPrestataires}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{v.nbMissions}</td>
                <td className="px-4 py-2.5">
                  <div className="flex h-2 w-40 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-primary" style={{ width: `${(v.nbPrestataires / maxValeur) * 100}%` }} />
                    <div className="h-full bg-amber-400" style={{ width: `${(v.nbMissions / maxValeur) * 100}%` }} />
                  </div>
                </td>
              </tr>
            ))}
            {villes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Aucune donnée pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> Prestataires</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" /> Missions</span>
      </p>
    </div>
  );
}
