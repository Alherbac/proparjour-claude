"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ResumeCommissions } from "@/lib/admin/commissions";
import { modifierTauxCommission } from "@/app/actions/admin-commission";

const STATUT_LABEL: Record<string, string> = {
  en_attente: "En attente de paiement",
  sequestre: "Séquestré (mission en cours)",
  libere: "Perçue (mission terminée)",
  rembourse: "Annulée (remboursée)",
  echec: "Échec de paiement",
};

export function CommissionsScreen({ resume, peutModifier }: { resume: ResumeCommissions; peutModifier: boolean }) {
  const router = useRouter();
  const [taux, setTaux] = useState(String(resume.tauxActuel));
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ type: "succes" | "erreur"; texte: string } | null>(null);

  async function enregistrer() {
    setEnvoi(true);
    setMessage(null);
    const result = await modifierTauxCommission(Number(taux));
    setEnvoi(false);
    if (result.success) {
      setMessage({ type: "succes", texte: "Taux mis à jour." });
      router.refresh();
    } else {
      setMessage({ type: "erreur", texte: result.error });
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display-serif text-2xl text-foreground">Commissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Le taux ne s&apos;applique qu&apos;aux nouvelles missions — celles déjà créées gardent le taux appliqué au
          moment de leur création.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background p-5">
          <p className="text-xs text-muted-foreground">Taux actuel</p>
          <p className="mt-1 font-display-serif text-2xl text-foreground">{resume.tauxActuel}%</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-5">
          <p className="text-xs text-muted-foreground">Commissions perçues (missions terminées)</p>
          <p className="mt-1 font-display-serif text-2xl text-foreground">{resume.totalPercuLibere.toFixed(2)} €</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-5">
          <p className="text-xs text-muted-foreground">En attente (missions en cours)</p>
          <p className="mt-1 font-display-serif text-2xl text-foreground">{resume.totalEnAttente.toFixed(2)} €</p>
        </div>
      </div>

      {peutModifier && (
        <div className="rounded-2xl border border-border bg-background p-5">
          <h2 className="text-sm font-semibold text-foreground">Modifier le taux global</h2>
          <div className="mt-3 flex items-end gap-3">
            <div className="relative w-32">
              <Input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={taux}
                onChange={(e) => setTaux(e.target.value)}
                className="pr-7"
              />
              <Percent className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
            <Button size="sm" className="rounded-full" disabled={envoi} onClick={enregistrer}>
              {envoi && <Loader2 className="size-3.5 animate-spin" />}
              Enregistrer
            </Button>
          </div>
          {message && (
            <p className={cn("mt-2 text-sm", message.type === "succes" ? "text-muted-foreground" : "text-destructive")}>
              {message.texte}
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Statut du paiement</th>
              <th className="px-4 py-2.5 font-medium">Nb de missions</th>
              <th className="px-4 py-2.5 font-medium">Commissions</th>
            </tr>
          </thead>
          <tbody>
            {resume.parStatut.map((s) => (
              <tr key={s.statut} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5 text-foreground">{STATUT_LABEL[s.statut] ?? s.statut}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{s.nb}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{s.montant.toFixed(2)} €</td>
              </tr>
            ))}
            {resume.parStatut.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Aucune donnée pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
