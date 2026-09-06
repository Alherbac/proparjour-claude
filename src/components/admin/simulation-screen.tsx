"use client";

import { useState } from "react";
import { AdminInput } from "@/components/admin/ui/input";
import { AdminSection, AdminH1 } from "@/components/admin/ui/section";

const champLabel = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--a-text-2)]";

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
        <AdminH1>Simulation</AdminH1>
        <p className="mt-1 max-w-xl text-[13px] text-[var(--a-text-2)]">
          Prévisualise la répartition d&apos;un montant de mission entre commission plateforme et versement
          prestataire — utile avant de modifier le taux global (voir la page Commissions).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSection>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="montant" className={champLabel}>
                Montant de la mission (€)
              </label>
              <AdminInput id="montant" type="number" min={0} step="1" value={montant} onChange={(e) => setMontant(e.target.value)} />
            </div>
            <div>
              <label htmlFor="taux" className={champLabel}>
                Taux de commission (%)
              </label>
              <AdminInput id="taux" type="number" min={0} max={100} step="0.5" value={taux} onChange={(e) => setTaux(e.target.value)} />
            </div>
          </div>
          <p className="mt-3 text-[12px] text-[var(--a-text-3)]">Taux actuellement appliqué à la plateforme : {tauxActuel}%</p>
        </AdminSection>

        <AdminSection title="Répartition">
          <dl className="space-y-2 text-[13px]">
            <div className="flex items-center justify-between">
              <dt className="text-[var(--a-text-2)]">Commission plateforme</dt>
              <dd className="font-semibold text-[var(--a-ink)]">{commission.toFixed(2)} €</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[var(--a-text-2)]">Versé au prestataire</dt>
              <dd className="font-semibold text-[var(--a-ink)]">{netPrestataire.toFixed(2)} €</dd>
            </div>
            {tauxNum !== tauxActuel && (
              <div className="flex items-center justify-between border-t border-[var(--a-border)] pt-2">
                <dt className="text-[var(--a-text-2)]">Écart vs taux actuel ({tauxActuel}%)</dt>
                <dd className="font-semibold" style={{ color: ecart >= 0 ? "var(--a-badge-green-text)" : "var(--a-badge-red-text)" }}>
                  {ecart >= 0 ? "+" : ""}
                  {ecart.toFixed(2)} €
                </dd>
              </div>
            )}
          </dl>
        </AdminSection>
      </div>
    </div>
  );
}
