"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Wallet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{nomComplet(versement.prestataire)}</p>
          <p className="text-sm text-muted-foreground">
            {libelleMetier(versement.metier)} · {versement.lieu} · {versement.dateMission}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-heading text-lg font-semibold text-foreground">{versement.montant} €</span>
          {!ouvert ? (
            <Button size="sm" onClick={() => setOuvert(true)} className="gap-1.5">
              <Wallet className="size-3.5" />
              Marquer comme versé
            </Button>
          ) : null}
        </div>
      </div>
      {ouvert && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Référence du virement (optionnel)"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <Button size="sm" onClick={confirmer} disabled={isPending} className="gap-1.5">
            <Check className="size-3.5" />
            {isPending ? "Enregistrement..." : "Confirmer le virement"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOuvert(false)}>
            Annuler
          </Button>
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
          <h2 className="font-heading text-lg font-semibold text-foreground">À verser</h2>
          <span className="text-sm text-muted-foreground">
            {aVerser.length} virement{aVerser.length > 1 ? "s" : ""} · {totalAVerser.toFixed(2)} € au total
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {aVerser.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-background py-10 text-center text-sm text-muted-foreground">
              Aucun virement en attente — tout ce qui est débloqué a déjà été versé.
            </p>
          ) : (
            aVerser.map((v) => <LigneAVerser key={v.missionLigneId} versement={v} />)
          )}
        </div>
      </div>

      <div>
        <h2 className="font-heading text-lg font-semibold text-foreground">Historique des virements</h2>
        <div className="mt-3 space-y-2">
          {effectues.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun virement enregistré pour l&apos;instant.</p>
          ) : (
            effectues.map((v) => (
              <div key={v.missionLigneId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
                <div>
                  <p className="font-medium text-foreground">{nomComplet(v.prestataire)}</p>
                  <p className="text-sm text-muted-foreground">
                    {libelleMetier(v.metier)} · {v.lieu} · {v.dateMission}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Versé le {new Date(v.verseLe).toLocaleDateString("fr-FR")} par {nomComplet(v.versePar)}
                    {v.reference ? ` · réf. ${v.reference}` : ""}
                  </p>
                </div>
                <span className="font-heading text-base font-semibold text-foreground">{v.montant} €</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
