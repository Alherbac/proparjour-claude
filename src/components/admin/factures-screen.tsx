"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FileDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MissionAdminRow } from "@/lib/admin/missions";

const STATUT_LABEL: Record<string, { label: string; style: string }> = {
  sequestre: { label: "Séquestré", style: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  libere: { label: "Payé", style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  rembourse: { label: "Remboursé", style: "bg-secondary text-secondary-foreground" },
};

export function FacturesScreen({
  missions,
  total,
  totalPages,
  page,
  client,
}: {
  missions: MissionAdminRow[];
  total: number;
  totalPages: number;
  page: number;
  client: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recherche, setRecherche] = useState(client);

  function chercher() {
    const params = new URLSearchParams(searchParams.toString());
    if (recherche.trim()) params.set("client", recherche.trim());
    else params.delete("client");
    params.delete("page");
    router.push(`/admin/factures?${params.toString()}`);
  }

  function aller(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p > 1) params.set("page", String(p));
    else params.delete("page");
    router.push(`/admin/factures?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display-serif text-2xl text-foreground">Factures</h1>
        <p className="mt-1 text-sm text-muted-foreground">{total} mission{total > 1 ? "s" : ""} facturée{total > 1 ? "s" : ""}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          chercher();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un client..."
            className="pl-9"
          />
        </div>
        <button
          type="submit"
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/40"
        >
          Rechercher
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Client</th>
              <th className="px-4 py-2.5 font-medium">Lieu</th>
              <th className="px-4 py-2.5 font-medium">Montant</th>
              <th className="px-4 py-2.5 font-medium">Statut</th>
              <th className="px-4 py-2.5 font-medium">Facture</th>
            </tr>
          </thead>
          <tbody>
            {missions.map((m) => {
              const statut = m.paiement ? STATUT_LABEL[m.paiement.statut] : null;
              return (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5 text-foreground">{m.date_mission}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {m.recruteur ? `${m.recruteur.prenom ?? ""} ${m.recruteur.nom ?? ""}`.trim() || "—" : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.lieu}</td>
                  <td className="px-4 py-2.5 text-foreground">{m.montant_total} €</td>
                  <td className="px-4 py-2.5">
                    {statut && (
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", statut.style)}>{statut.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/api/factures/${m.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                    >
                      <FileDown className="size-3.5" />
                      Voir
                    </Link>
                  </td>
                </tr>
              );
            })}
            {missions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Aucune facture trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => aller(p)}
              className={cn(
                "flex size-8 items-center justify-center rounded-full border text-sm",
                p === page ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
