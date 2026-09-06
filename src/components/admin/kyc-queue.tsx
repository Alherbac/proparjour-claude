"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquareWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { statutAffiche } from "@/config/documents-requis";
import type { DossierKyc } from "@/lib/admin/kyc";
import { AdminBadge, type AdminBadgeTone } from "@/components/admin/ui/badge";

const GROUPES = [
  { cle: "a_traiter", label: "À traiter" },
  { cle: "valides", label: "Validés" },
  { cle: "refuses", label: "Refusés" },
] as const;

const STATUT_BADGE: Record<string, { label: string; tone: AdminBadgeTone }> = {
  en_attente: { label: "En attente", tone: "orange" },
  partiel: { label: "Partiel", tone: "orange" },
  valide: { label: "Validé", tone: "green" },
  refuse: { label: "Refusé", tone: "red" },
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
              "shrink-0 rounded-[9px] px-4 py-2 text-[13px] font-semibold transition-colors",
              ongletActif === g.cle
                ? "bg-[var(--a-accent)] text-white"
                : "bg-[var(--a-surface-2)] text-[var(--a-ink)]",
            )}
            style={{ fontFamily: "var(--a-font-display)" }}
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
              className="flex items-center justify-between rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4 transition-colors hover:border-[var(--a-accent)]/40"
            >
              <div>
                <p className="font-semibold text-[var(--a-ink)]">
                  {dossier.user.prenom} {dossier.user.nom}
                </p>
                <p className="text-[13px] text-[var(--a-text-2)]">
                  {METIER_LABELS[dossier.profil.metier]} · {dossier.profil.ville} · inscrit le{" "}
                  {new Date(dossier.profil.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {dossier.documentDejaDemande && (
                  <span title="Document déjà demandé">
                    <MessageSquareWarning className="size-4" style={{ color: "var(--a-orange)" }} />
                  </span>
                )}
                <AdminBadge tone={badge.tone}>{badge.label}</AdminBadge>
              </div>
            </Link>
          );
        })}
        {actifs.length === 0 && (
          <p className="py-8 text-center text-[13px] text-[var(--a-text-3)]">Rien ici pour l&apos;instant.</p>
        )}
      </div>
    </div>
  );
}
