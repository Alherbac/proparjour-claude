"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/onboarding/form-field";

export function SimulationScreen({ tauxActuel }: { tauxActuel: number }) {
  const [montant, setMontant] = useState("200");
  const [taux, setTaux] = useState(String(tauxActuel));

  const montantNum = Number(montant) || 0;
  const tauxNum = Number(taux) || 0;
  const commission = Math.round(montantNum * (tauxNum / 100) * 100) / 100;
  const netPrestataire = Math.round((montantNum - commission) * 100) / 100;

  const commissionActuelle = Math.round(montantNum * (tauxActuel / 100) * 100) / 100;
  const ecart = Math.round((commission - commissionActuelle) * 100) / 100;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display-serif text-2xl text-foreground">Simulation</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Prévisualise la répartition d&apos;un montant de mission entre commission plateforme et versement
          prestataire — utile avant de modifier le taux global (voir la page Commissions).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Montant de la mission (€)" htmlFor="montant">
              <Input id="montant" type="number" min={0} step="1" value={montant} onChange={(e) => setMontant(e.target.value)} />
            </FormField>
            <FormField label="Taux de commission (%)" htmlFor="taux">
              <Input id="taux" type="number" min={0} max={100} step="0.5" value={taux} onChange={(e) => setTaux(e.target.value)} />
            </FormField>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Taux actuellement appliqué à la plateforme : {tauxActuel}%</p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-5">
          <h2 className="text-sm font-semibold text-foreground">Répartition</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Commission plateforme</dt>
              <dd className="font-medium text-foreground">{commission.toFixed(2)} €</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Versé au prestataire</dt>
              <dd className="font-medium text-foreground">{netPrestataire.toFixed(2)} €</dd>
            </div>
            {tauxNum !== tauxActuel && (
              <div className="flex items-center justify-between border-t border-border pt-2">
                <dt className="text-muted-foreground">Écart vs taux actuel ({tauxActuel}%)</dt>
                <dd className={ecart >= 0 ? "font-medium text-emerald-600 dark:text-emerald-400" : "font-medium text-destructive"}>
                  {ecart >= 0 ? "+" : ""}
                  {ecart.toFixed(2)} €
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
