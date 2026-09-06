"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { AdminSidebar, type AdminBadges } from "@/components/admin/admin-sidebar";
import { SidePanel } from "@/components/admin/side-panel";
import { AdminInput } from "@/components/admin/ui/input";
import type { PrestataireSimulable } from "@/lib/admin/utilisateurs";
import { METIERS } from "@/config/metiers";

/**
 * Coquille client de l'espace admin — porte l'état "Mode simulation"
 * (§4 du prompt), seul état qui doit survivre à la navigation entre
 * pages /admin/* (le layout server ne se démonte pas entre elles).
 *
 * Portée volontairement limitée : pas de bascule d'authentification
 * réelle (usurper une session prestataire serait une fonctionnalité
 * de sécurité à part entière, hors périmètre d'une passe visuelle) —
 * "naviguer en tant que prestataire" ouvre ici sa fiche publique
 * réelle dans un nouvel onglet, avec le bandeau non masquable comme
 * rappel visuel du contexte. Voir le rapport final pour ce choix.
 */
export function AdminShellClient({
  badges,
  nomComplet,
  roleLabel,
  prestatairesSimulables,
  children,
}: {
  badges: AdminBadges;
  nomComplet: string;
  roleLabel: string;
  prestatairesSimulables: PrestataireSimulable[];
  children: React.ReactNode;
}) {
  const [picklerOuvert, setPickerOuvert] = useState(false);
  const [simulation, setSimulation] = useState<PrestataireSimulable | null>(null);
  const [recherche, setRecherche] = useState("");

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return prestatairesSimulables;
    return prestatairesSimulables.filter((p) => p.nom.toLowerCase().includes(q));
  }, [prestatairesSimulables, recherche]);

  return (
    <div className="ppj-admin flex h-screen w-full overflow-hidden" style={{ fontFamily: "var(--a-font-body)" }}>
      <AdminSidebar badges={badges} nomComplet={nomComplet} roleLabel={roleLabel} onOuvrirSimulation={() => setPickerOuvert(true)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {simulation && (
          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-7 py-[11px]"
            style={{ background: "rgba(224,154,58,0.16)", borderColor: "rgba(224,154,58,0.4)" }}
          >
            <div className="flex items-center gap-2.5">
              <span className="size-[7px] shrink-0 rounded-full" style={{ background: "var(--a-orange)" }} aria-hidden />
              <div>
                <p className="text-[12.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
                  Mode simulation actif — vous naviguez en tant que {simulation.nom}
                </p>
                <p className="text-[11.5px] text-[var(--a-text-2)]">
                  Toutes vos actions sont journalisées. Ce bandeau ne peut pas être masqué.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/prestataires/${simulation.profilId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--a-border-strong)] bg-[var(--a-surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--a-ink)] hover:bg-[var(--a-surface-2)]"
                style={{ fontFamily: "var(--a-font-display)" }}
              >
                <ExternalLink className="size-3.5" />
                Voir la fiche publique
              </a>
              <button
                type="button"
                onClick={() => setSimulation(null)}
                className="rounded-[9px] px-3 py-1.5 text-[12px] font-bold text-[var(--a-accent-hover)] hover:underline"
                style={{ fontFamily: "var(--a-font-display)" }}
              >
                Quitter la simulation
              </button>
            </div>
          </div>
        )}

        <main className="a-scroll min-h-0 flex-1 overflow-y-auto" style={{ background: "var(--a-bg)" }}>
          <div className="mx-auto max-w-[1400px] px-7 pt-6 pb-12">{children}</div>
        </main>
      </div>

      <SidePanel titre="Mode simulation" ouvert={picklerOuvert} onFermer={() => setPickerOuvert(false)}>
        <p className="mb-3 text-[13px] text-[var(--a-text-2)]">
          Choisissez un prestataire validé pour afficher le bandeau de simulation et accéder rapidement à sa fiche
          publique.
        </p>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--a-text-3)]" />
          <AdminInput
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un prestataire..."
            className="pl-9"
          />
        </div>
        <div className="space-y-1">
          {filtres.slice(0, 40).map((p) => (
            <button
              key={p.profilId}
              type="button"
              onClick={() => {
                setSimulation(p);
                setPickerOuvert(false);
              }}
              className="flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-[13px] hover:bg-[var(--a-surface-2)]"
            >
              <span className="font-medium text-[var(--a-ink)]">{p.nom}</span>
              <span className="text-[11.5px] text-[var(--a-text-3)]">
                {METIERS.find((m) => m.id === p.metier)?.filiere ?? p.metier}
              </span>
            </button>
          ))}
          {filtres.length === 0 && <p className="py-6 text-center text-[13px] text-[var(--a-text-3)]">Aucun prestataire validé.</p>}
        </div>
      </SidePanel>
    </div>
  );
}
