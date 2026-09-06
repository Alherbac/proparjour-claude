"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export type PosteRow = {
  cle: string;
  initiale: string;
  metierLabel: string;
  meta: string;
  pillLabel: string;
  pillClasses: string;
};

export type SuiviEtape = {
  cle: string;
  label: string;
  meta: string;
  fait: boolean;
};

export type ProfessionnelRow = {
  cle: string;
  nom: string;
  metierLabel: string;
  meta: string;
  href: string | null;
};

const ONGLETS = ["Détail", "Professionnels", "Documents", "Facturation"] as const;
type Onglet = (typeof ONGLETS)[number];

/**
 * Onglets de l'écran "Détail mission" — reconstruction fidèle du
 * dossier design (captures/, README §"Détail mission"). Purement
 * présentationnel : le paiement réel (Stripe), l'acceptation/l'ajustement
 * du devis restent exclusivement dans DevisCard/MessageThread plus bas
 * sur la même page — le bouton "Payer" ici n'est qu'un raccourci qui y
 * ramène, jamais un second déclencheur de paiement.
 */
export function DetailMissionTabs({
  postes,
  suivi,
  montant,
  professionnels,
  facturation,
  informationsManquantes,
}: {
  postes: PosteRow[];
  suivi: SuiviEtape[];
  montant: { prestations: string; fraisService: string; total: string; payable: boolean; legende: string };
  professionnels: ProfessionnelRow[];
  facturation: { disponible: boolean; href: string | null; explication: string };
  informationsManquantes?: React.ReactNode;
}) {
  const [onglet, setOnglet] = useState<Onglet>("Détail");

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-border">
        {ONGLETS.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOnglet(o)}
            className={cn(
              "border-b-2 px-3.5 py-3 text-sm font-medium transition-colors",
              onglet === o ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {o}
          </button>
        ))}
      </div>

      {onglet === "Détail" && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-5 content-start">
            <div className="rounded-2xl border border-border bg-background p-5">
              <h2 className="mb-4 font-heading text-base font-semibold text-foreground">Postes demandés</h2>
              <div className="grid gap-3">
                {postes.map((p) => (
                  <div key={p.cle} className="flex flex-wrap items-center gap-3.5 rounded-xl border border-border/70 p-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-primary/20 bg-primary/10 font-display-serif text-lg text-primary">
                      {p.initiale}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-foreground">{p.metierLabel}</span>
                      <span className="mt-0.5 block text-[13px] text-muted-foreground">{p.meta}</span>
                    </span>
                    <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] font-medium", p.pillClasses)}>
                      {p.pillLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {informationsManquantes}
          </div>

          <div className="grid gap-5 content-start">
            <div className="rounded-2xl border border-border bg-background p-5">
              <h2 className="mb-4 font-heading text-base font-semibold text-foreground">Suivi</h2>
              <div className="grid">
                {suivi.map((s, i) => (
                  <div key={s.cle} className="flex items-start gap-3.5">
                    <span className="grid shrink-0 justify-items-center self-stretch">
                      <span
                        className={cn(
                          "mt-1 block size-2.5 rounded-full border-2",
                          s.fait ? "border-primary bg-primary" : "border-border bg-background",
                        )}
                      />
                      {i < suivi.length - 1 && <span className="mt-1 block w-px flex-1 bg-border" style={{ minHeight: 20 }} />}
                    </span>
                    <span className="min-w-0 pb-4">
                      <span className={cn("block text-[14.5px] font-semibold", s.fait ? "text-foreground" : "text-muted-foreground")}>
                        {s.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground/80">{s.meta}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5">
              <h2 className="mb-3.5 font-heading text-base font-semibold text-foreground">Montant</h2>
              <div className="grid gap-2.5 text-[14.5px]">
                <span className="flex justify-between gap-3.5 text-muted-foreground">
                  Prestations <span className="text-foreground">{montant.prestations}</span>
                </span>
                <span className="flex justify-between gap-3.5 text-muted-foreground">
                  Frais de service <span className="text-foreground">{montant.fraisService}</span>
                </span>
                <span className="my-0.5 block h-px bg-border" />
                <span className="flex justify-between gap-3.5 font-semibold text-foreground">
                  Total <span>{montant.total}</span>
                </span>
              </div>
              {montant.payable ? (
                <a
                  href="#messagerie"
                  className="mt-4 block rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Payer et confirmer la mission
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-4 w-full cursor-not-allowed rounded-xl border border-ppj-line-button bg-secondary px-4 py-2.5 text-sm font-semibold text-ppj-text-4"
                >
                  Payer et confirmer la mission
                </button>
              )}
              <p className="mt-2.5 text-center text-xs leading-relaxed text-muted-foreground">{montant.legende}</p>
            </div>
          </div>
        </div>
      )}

      {onglet === "Professionnels" && (
        <div className="mt-5 rounded-2xl border border-border bg-background p-5">
          {professionnels.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun professionnel retenu pour l&apos;instant.</p>
          ) : (
            <div className="grid gap-3">
              {professionnels.map((p) => {
                const Contenu = (
                  <>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground/70">
                      {p.nom.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{p.nom}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.metierLabel} · {p.meta}
                      </span>
                    </span>
                  </>
                );
                return p.href ? (
                  <Link
                    key={p.cle}
                    href={p.href}
                    className="flex items-center gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:border-foreground/30"
                  >
                    {Contenu}
                  </Link>
                ) : (
                  <div key={p.cle} className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
                    {Contenu}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {onglet === "Documents" && (
        <div className="mt-5 rounded-2xl border border-border bg-background p-5">
          <p className="text-sm text-muted-foreground">Aucun document à fournir pour cette mission.</p>
        </div>
      )}

      {onglet === "Facturation" && (
        <div className="mt-5 rounded-2xl border border-border bg-background p-5">
          {facturation.disponible && facturation.href ? (
            <Link
              href={facturation.href}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
            >
              <FileText className="size-4" />
              Voir la facture
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">{facturation.explication}</p>
          )}
        </div>
      )}
    </div>
  );
}
