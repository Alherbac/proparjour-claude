"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wallet, Check } from "lucide-react";
import { AdminButton } from "@/components/admin/ui/button";
import { marquerVersementEffectue } from "@/app/actions/admin-versements";
import type { VersementAFaire, VersementEffectue } from "@/lib/admin/versements";
import { METIERS } from "@/config/metiers";

function nomComplet(p: { prenom: string | null; nom: string | null; email?: string } | null) {
  if (!p) return "Prestataire inconnu";
  const nom = [p.prenom, p.nom].filter(Boolean).join(" ");
  return nom || p.email || "Prestataire";
}

function libelleMetier(id: string) {
  return METIERS.find((m) => m.id === id)?.filiere ?? id;
}

function LigneAVerser({ versement }: { versement: VersementAFaire }) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [isPending, startTransition] = useTransition();

  function confirmer() {
    startTransition(async () => {
      const result = await marquerVersementEffectue(versement.missionLigneId, reference);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Virement de ${versement.montant} € marqué comme effectué.`);
      setOuvert(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-[var(--a-ink)]">{nomComplet(versement.prestataire)}</p>
          <p className="text-[13px] text-[var(--a-text-2)]">
            {libelleMetier(versement.metier)} · {versement.lieu} · {versement.dateMission}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[17px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
            {versement.montant} €
          </span>
          {!ouvert ? (
            <AdminButton size="sm" variant="primary" onClick={() => setOuvert(true)}>
              <Wallet className="size-3.5" />
              Marquer comme versé
            </AdminButton>
          ) : null}
        </div>
      </div>
      {ouvert && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--a-border)] pt-3">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Référence du virement (optionnel)"
            className="h-[38px] min-w-0 flex-1 rounded-[11px] border border-[var(--a-border-strong)] bg-[var(--a-surface)] px-3 text-[13px] text-[var(--a-ink)] outline-none placeholder:text-[var(--a-text-3)] focus:border-[var(--a-accent)]"
          />
          <AdminButton size="sm" variant="success" onClick={confirmer} disabled={isPending}>
            <Check className="size-3.5" />
            {isPending ? "Enregistrement..." : "Confirmer le virement"}
          </AdminButton>
          <AdminButton size="sm" variant="secondary" onClick={() => setOuvert(false)}>
            Annuler
          </AdminButton>
        </div>
      )}
    </div>
  );
}

export function VersementsScreen({
  aVerser,
  effectues,
}: {
  aVerser: VersementAFaire[];
  effectues: VersementEffectue[];
}) {
  const totalAVerser = aVerser.reduce((s, v) => s + v.montant, 0);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[14.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
            À verser
          </h2>
          <span className="text-[13px] text-[var(--a-text-2)]">
            {aVerser.length} virement{aVerser.length > 1 ? "s" : ""} · {totalAVerser.toFixed(2)} € au total
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {aVerser.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--a-border-strong)] bg-[var(--a-surface)] py-10 text-center text-[13px] text-[var(--a-text-3)]">
              Aucun virement en attente — tout ce qui est débloqué a déjà été versé.
            </p>
          ) : (
            aVerser.map((v) => <LigneAVerser key={v.missionLigneId} versement={v} />)
          )}
        </div>
      </div>

      <div>
        <h2 className="text-[14.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
          Historique des virements
        </h2>
        <div className="mt-3 space-y-2">
          {effectues.length === 0 ? (
            <p className="text-[13px] text-[var(--a-text-3)]">Aucun virement enregistré pour l&apos;instant.</p>
          ) : (
            effectues.map((v) => (
              <div key={v.missionLigneId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
                <div>
                  <p className="font-semibold text-[var(--a-ink)]">{nomComplet(v.prestataire)}</p>
                  <p className="text-[13px] text-[var(--a-text-2)]">
                    {libelleMetier(v.metier)} · {v.lieu} · {v.dateMission}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--a-text-3)]">
                    Versé le {new Date(v.verseLe).toLocaleDateString("fr-FR")} par {nomComplet(v.versePar)}
                    {v.reference ? ` · réf. ${v.reference}` : ""}
                  </p>
                </div>
                <span className="text-[15px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
                  {v.montant} €
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
