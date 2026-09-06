"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { AdminButton } from "@/components/admin/ui/button";
import { AdminInput } from "@/components/admin/ui/input";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminKpiCard } from "@/components/admin/ui/kpi-card";
import { AdminTableShell, AdminTh, AdminTr, AdminTd } from "@/components/admin/ui/table-shell";
import type { DemandeSuppressionAvecUser, LigneJournalSuppression } from "@/lib/admin/suppressions";
import { traiterDemandeSuppression } from "@/app/actions/suppression-compte";

function filtrerDepuis90j(journal: LigneJournalSuppression[]) {
  return journal.filter((j) => Date.now() - new Date(j.date).getTime() < 90 * 86_400_000);
}

const TYPE_LABEL: Record<string, string> = {
  prestataire: "Prestataire",
  recruteur_particulier: "Client particulier",
  recruteur_entreprise: "Client entreprise",
};

function LigneDemande({ demande }: { demande: DemandeSuppressionAvecUser }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const [refusOuvert, setRefusOuvert] = useState(false);
  const [motifRefus, setMotifRefus] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  function supprimer() {
    startTransition(async () => {
      const result = await traiterDemandeSuppression(demande.id, "traitee");
      if (result.success) router.refresh();
      else setErreur(result.error);
    });
  }

  function refuser() {
    startTransition(async () => {
      const result = await traiterDemandeSuppression(demande.id, "refusee", motifRefus);
      if (result.success) router.refresh();
      else setErreur(result.error);
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
            {demande.prenom || demande.nom ? `${demande.prenom ?? ""} ${demande.nom ?? ""}`.trim() : "Utilisateur"}
          </p>
          <p className="text-[12.5px] text-[var(--a-text-2)]">{demande.email ?? "—"}</p>
          <p className="mt-1 text-[11.5px] text-[var(--a-text-3)]">Demande du {new Date(demande.createdAt).toLocaleDateString("fr-FR")}</p>
          {demande.motif && <p className="mt-2 text-[13px] text-[var(--a-ink)]">« {demande.motif} »</p>}
        </div>

        <div className="flex flex-col items-end gap-2">
          {!confirmationSuppression && !refusOuvert && (
            <div className="flex items-center gap-2">
              <AdminButton size="sm" variant="secondary" onClick={() => setRefusOuvert(true)}>
                <X className="size-3.5" />
                Refuser
              </AdminButton>
              <AdminButton size="sm" variant="danger" onClick={() => setConfirmationSuppression(true)}>
                <Trash2 className="size-3.5" />
                Supprimer le compte
              </AdminButton>
            </div>
          )}

          {confirmationSuppression && (
            <div className="flex flex-col items-end gap-1.5">
              <p className="text-[12px] text-[var(--a-badge-red-text)]">Action irréversible — confirmer ?</p>
              <div className="flex gap-2">
                <AdminButton size="sm" variant="secondary" onClick={() => setConfirmationSuppression(false)}>
                  Annuler
                </AdminButton>
                <AdminButton size="sm" variant="danger" disabled={pending} onClick={supprimer}>
                  Confirmer la suppression
                </AdminButton>
              </div>
            </div>
          )}

          {refusOuvert && (
            <div className="flex flex-col items-end gap-1.5">
              <AdminInput value={motifRefus} onChange={(e) => setMotifRefus(e.target.value)} placeholder="Motif du refus" className="h-8 w-56 text-[12px]" />
              <div className="flex gap-2">
                <AdminButton size="sm" variant="secondary" onClick={() => setRefusOuvert(false)}>
                  Annuler
                </AdminButton>
                <AdminButton size="sm" variant="primary" disabled={pending} onClick={refuser}>
                  Confirmer le refus
                </AdminButton>
              </div>
            </div>
          )}

          {erreur && <p className="text-[12px] text-[var(--a-badge-red-text)]">{erreur}</p>}
        </div>
      </div>
    </div>
  );
}

export function SuppressionsScreen({
  demandes,
  journal,
}: {
  demandes: DemandeSuppressionAvecUser[];
  journal: LigneJournalSuppression[];
}) {
  const depuis90j = filtrerDepuis90j(journal);
  const compteurRoles = new Map<string, number>();
  for (const j of depuis90j) compteurRoles.set(j.role ?? "—", (compteurRoles.get(j.role ?? "—") ?? 0) + 1);
  const motifDominant = [...compteurRoles.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="space-y-5">
      <div>
        <AdminH1>Suppressions</AdminH1>
        <p className="mt-1 text-[13px] text-[var(--a-text-2)]">
          Journal des comptes supprimés avec motif obligatoire. On conserve la trace nécessaire à la conformité,
          rien de plus.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminKpiCard label="Suppressions (90 j)" valeur={String(depuis90j.length)} />
        <AdminKpiCard label="Rôle dominant" valeur={motifDominant ? TYPE_LABEL[motifDominant] ?? motifDominant : "—"} aide="parmi les 90 derniers jours" />
        <AdminKpiCard label="Demandes en attente" valeur={String(demandes.length)} />
      </div>

      <div>
        <h2 className="mb-2.5 text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
          En attente de décision
        </h2>
        {demandes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--a-border-strong)] py-8 text-center text-[13px] text-[var(--a-text-3)]">
            Aucune demande en attente.
          </p>
        ) : (
          <div className="space-y-3">
            {demandes.map((d) => (
              <LigneDemande key={d.id} demande={d} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2.5 text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
          Journal des comptes supprimés
        </h2>
        <AdminTableShell minWidth={800}>
          <table className="w-full">
            <thead>
              <tr>
                <AdminTh>Compte</AdminTh>
                <AdminTh>Rôle</AdminTh>
                <AdminTh>Motif déclaré</AdminTh>
                <AdminTh>Date</AdminTh>
              </tr>
            </thead>
            <tbody>
              {journal.map((j, i) => (
                <AdminTr key={i}>
                  <AdminTd truncate>{j.compteAnonymise}</AdminTd>
                  <AdminTd truncate>{j.role ? TYPE_LABEL[j.role] ?? j.role : "—"}</AdminTd>
                  <AdminTd truncate>{j.motif ?? "—"}</AdminTd>
                  <AdminTd truncate>{new Date(j.date).toLocaleDateString("fr-FR")}</AdminTd>
                </AdminTr>
              ))}
              {journal.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-[var(--a-text-3)]">
                    Aucune suppression pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminTableShell>
      </div>
    </div>
  );
}
