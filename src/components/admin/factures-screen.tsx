"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FileDown, Search } from "lucide-react";
import { AdminInput } from "@/components/admin/ui/input";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminKpiCard } from "@/components/admin/ui/kpi-card";
import { AdminBadge, type AdminBadgeTone } from "@/components/admin/ui/badge";
import { AdminTableShell, AdminTh, AdminTr, AdminTd } from "@/components/admin/ui/table-shell";
import { referenceMission } from "@/lib/admin/reference";
import { cn } from "@/lib/utils";
import type { MissionAdminRow } from "@/lib/admin/missions";

const STATUT_INFO: Record<string, { label: string; tone: AdminBadgeTone }> = {
  sequestre: { label: "Séquestré", tone: "orange" },
  libere: { label: "Payée", tone: "green" },
  rembourse: { label: "Remboursée", tone: "grey" },
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

  const montantCumule = missions.reduce((s, m) => s + Number(m.montant_total), 0);

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
    <div className="space-y-5">
      <div>
        <AdminH1>Factures</AdminH1>
        <p className="mt-1 text-[13px] text-[var(--a-text-2)]">
          Numérotation déterministe (PPJ-AAAA-ID), PDF généré côté client, renvoyable par e-mail.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminKpiCard label="Factures émises" valeur={String(total)} aide="missions facturables" />
        <AdminKpiCard label="Montant TTC cumulé" valeur={`${montantCumule.toLocaleString("fr-FR")} €`} aide="page affichée" />
        <AdminKpiCard label="Échecs d'envoi" valeur="—" aide="envoi e-mail non câblé sur cette instance" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          chercher();
        }}
        className="flex items-center gap-2"
      >
        <div className="relative w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--a-text-3)]" />
          <AdminInput value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un client..." className="pl-9" />
        </div>
        <button type="submit" className="rounded-[9px] border border-[var(--a-border-strong)] px-3 py-[9px] text-[12.5px] font-semibold text-[var(--a-ink)] hover:bg-[var(--a-surface-2)]" style={{ fontFamily: "var(--a-font-display)" }}>
          Rechercher
        </button>
      </form>

      <AdminTableShell minWidth={1120}>
        <table className="w-full">
          <thead>
            <tr>
              <AdminTh>Numéro</AdminTh>
              <AdminTh>Mission</AdminTh>
              <AdminTh>Émetteur</AdminTh>
              <AdminTh>Destinataire</AdminTh>
              <AdminTh>TTC</AdminTh>
              <AdminTh>Envoi</AdminTh>
              <AdminTh>Facture</AdminTh>
            </tr>
          </thead>
          <tbody>
            {missions.map((m) => {
              const statut = m.paiement ? STATUT_INFO[m.paiement.statut] : null;
              return (
                <AdminTr key={m.id}>
                  <AdminTd truncate>{referenceMission(m)}</AdminTd>
                  <AdminTd truncate>{m.date_mission} · {m.lieu}</AdminTd>
                  <AdminTd truncate>ProParJour</AdminTd>
                  <AdminTd truncate>{m.recruteur ? `${m.recruteur.prenom ?? ""} ${m.recruteur.nom ?? ""}`.trim() || "—" : "—"}</AdminTd>
                  <AdminTd className="a-tabular">{m.montant_total} €</AdminTd>
                  <AdminTd>{statut && <AdminBadge tone={statut.tone}>{statut.label}</AdminBadge>}</AdminTd>
                  <AdminTd>
                    <Link href={`/api/factures/${m.id}`} target="_blank" className="inline-flex items-center gap-1.5 text-[12.5px] font-bold" style={{ color: "var(--a-accent)" }}>
                      <FileDown className="size-3.5" />
                      Voir
                    </Link>
                  </AdminTd>
                </AdminTr>
              );
            })}
            {missions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-[var(--a-text-3)]">
                  Aucune facture trouvée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminTableShell>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => aller(p)}
              className={cn(
                "flex size-8 items-center justify-center rounded-[9px] border text-[12.5px] font-semibold",
                p === page ? "border-[var(--a-accent)] bg-[var(--a-accent)] text-white" : "border-[var(--a-border-strong)] text-[var(--a-ink)] hover:border-[var(--a-accent)]/50",
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
