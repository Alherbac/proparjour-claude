"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { METIERS } from "@/config/metiers";
import { tarifJournalierAffiche } from "@/lib/tarif";
import { cn } from "@/lib/utils";
import type { CleCritere, Recommandation } from "@/lib/matching";

const LIGNES_CRITERES: { cle: CleCritere; label: string }[] = [
  { cle: "disponible", label: "Disponible" },
  { cle: "experience", label: "Expérience adaptée" },
  { cle: "zone", label: "Zone adaptée" },
  { cle: "tarif", label: "Tarif compatible" },
  { cle: "verifie", label: "Profil vérifié" },
  { cle: "fiabilite", label: "Fiabilité" },
];

export function ComparaisonModal({
  open,
  onOpenChange,
  selection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: Recommandation[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-full overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Comparer {selection.length} profils</DialogTitle>
        </DialogHeader>

        {selection.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sélectionnez au moins un profil à comparer.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr>
                  <th className="w-32" />
                  {selection.map((r) => {
                    const metier = METIERS.find((m) => m.id === r.prestataire.metier);
                    return (
                      <th key={r.prestataire.id} className="p-2 pb-3 text-center">
                        {r.prestataire.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
                          <img
                            src={r.prestataire.photo_url}
                            alt={r.prestataire.prenom ?? ""}
                            className="mx-auto size-12 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={cn(
                              "mx-auto flex size-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-foreground/70",
                              metier?.accent.gradient,
                            )}
                          >
                            {(r.prestataire.prenom ?? "P").charAt(0)}
                          </div>
                        )}
                        <p className="mt-1.5 font-medium text-foreground">{r.prestataire.prenom}</p>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Compatibilité
                  </td>
                  {selection.map((r) => (
                    <td key={r.prestataire.id} className="py-2 text-center font-semibold text-foreground">
                      {r.score}%
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Tarif</td>
                  {selection.map((r) => (
                    <td key={r.prestataire.id} className="py-2 text-center text-foreground">
                      {tarifJournalierAffiche(r.prestataire.tarif_montant, r.prestataire.tarif_type)} €/j
                    </td>
                  ))}
                </tr>
                {LIGNES_CRITERES.map((ligne) => (
                  <tr key={ligne.cle} className="border-t border-border">
                    <td className="py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {ligne.label}
                    </td>
                    {selection.map((r) => {
                      const critere = r.criteres.find((c) => c.cle === ligne.cle);
                      // La proximité géographique est dégressive, jamais
                      // excluante (correction produit 2026-09-19) : on
                      // affiche le niveau ("Excellente"/"Très bonne"/…)
                      // plutôt qu'un simple ✓, qui masquerait la nuance.
                      if (ligne.cle === "zone" && critere) {
                        const niveau = critere.label.split(" : ").pop();
                        return (
                          <td key={r.prestataire.id} className="py-2 text-center text-foreground">
                            {critere.etat === "non_renseigne" ? <span className="text-muted-foreground/40">Non renseignée</span> : niveau}
                          </td>
                        );
                      }
                      return (
                        <td key={r.prestataire.id} className="py-2 text-center">
                          {critere?.etat === "correspond" ? (
                            <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                          ) : critere?.etat === "non_renseigne" ? (
                            <span className="text-muted-foreground/40" title="Non renseigné">
                              ○
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">✗</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
