"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquareWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { statutAffiche } from "@/config/documents-requis";
import type { DossierKyc } from "@/lib/admin/kyc";

const GROUPES = [
  { cle: "a_traiter", label: "À traiter" },
  { cle: "valides", label: "Validés" },
  { cle: "refuses", label: "Refusés" },
] as const;

const STATUT_BADGE: Record<string, { label: string; style: string }> = {
  en_attente: { label: "🟠 En attente", style: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  partiel: { label: "🟡 Partiel", style: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  valide: { label: "🟢 Validé", style: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  refuse: { label: "🔴 Refusé", style: "bg-destructive/10 text-destructive" },
};

const METIER_LABELS: Record<string, string> = {
  securite: "Sécurité",
  accueil: "Accueil",
  vente: "Vente",
};

function groupe(dossier: DossierKyc): (typeof GROUPES)[number]["cle"] {
  const statut = statutAffiche(dossier);
  if (statut === "valide") return "valides";
  if (statut === "refuse") return "refuses";
  return "a_traiter";
}

export function KycQueue({ dossiers }: { dossiers: DossierKyc[] }) {
  const [ongletActif, setOngletActif] = useState<(typeof GROUPES)[number]["cle"]>("a_traiter");

  const parGroupe = GROUPES.map((g) => ({
    ...g,
    dossiers: dossiers.filter((d) => groupe(d) === g.cle),
  }));

  const actifs = parGroupe.find((g) => g.cle === ongletActif)!.dossiers;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto">
        {parGroupe.map((g) => (
          <button
            key={g.cle}
            type="button"
            aria-pressed={ongletActif === g.cle}
            onClick={() => setOngletActif(g.cle)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium",
              ongletActif === g.cle
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            {g.label} {g.dossiers.length > 0 && `(${g.dossiers.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {actifs.map((dossier) => {
          const badge = STATUT_BADGE[statutAffiche(dossier)];
          return (
            <Link
              key={dossier.profil.id}
              href={`/admin/validations/${dossier.profil.id}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-background p-4 shadow-sm transition-colors hover:border-primary/40"
            >
              <div>
                <p className="font-medium text-foreground">
                  {dossier.user.prenom} {dossier.user.nom}
                </p>
                <p className="text-sm text-muted-foreground">
                  {METIER_LABELS[dossier.profil.metier]} · {dossier.profil.ville} · inscrit le{" "}
                  {new Date(dossier.profil.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {dossier.documentDejaDemande && (
                  <span title="Document déjà demandé">
                    <MessageSquareWarning className="size-4 text-amber-600 dark:text-amber-400" />
                  </span>
                )}
                <span className={cn("rounded-full px-3 py-1 text-xs font-medium", badge.style)}>
                  {badge.label}
                </span>
              </div>
            </Link>
          );
        })}
        {actifs.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Rien ici pour l&apos;instant.</p>
        )}
      </div>
    </div>
  );
}
