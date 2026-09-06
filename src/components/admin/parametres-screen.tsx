"use client";

import { useState } from "react";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminTabs } from "@/components/admin/ui/tabs";
import { AdminBadge } from "@/components/admin/ui/badge";
import { TwoFactorSetup } from "@/components/admin/two-factor-setup";
import type { LigneJournalAudit } from "@/lib/admin/audit";

function Reglage({ label, aide, valeur }: { label: string; aide: string; valeur: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--a-border)] py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>{label}</p>
        <p className="text-[12px] text-[var(--a-text-2)]">{aide}</p>
      </div>
      <div className="shrink-0 text-[13px] font-semibold text-[var(--a-ink)]">{valeur}</div>
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = {
  mission_statut_force: "Statut de mission forcé",
  fonds_debloques: "Fonds débloqués",
  mission_annulee_admin: "Mission annulée",
  litige_ouvert_admin: "Litige ouvert",
  utilisateur_suspendu: "Compte suspendu",
  utilisateur_reactive: "Compte réactivé",
  message_admin_envoye: "Message envoyé",
  compte_supprime: "Compte supprimé",
  suppression_refusee: "Suppression refusée",
  taux_commission_modifie: "Taux de commission modifié",
  iban_consulte: "IBAN consulté",
  ville_creee: "Ville créée",
  ville_activee: "Ville activée",
  ville_desactivee: "Ville désactivée",
};

export function ParametresScreen({
  dejaActivee2fa,
  journal,
}: {
  dejaActivee2fa: boolean;
  journal: LigneJournalAudit[];
}) {
  const [onglet, setOnglet] = useState<"general" | "securite" | "logs">("securite");

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <AdminH1>Paramètres</AdminH1>

      <AdminTabs
        tabs={[
          { value: "general", label: "Général" },
          { value: "securite", label: "Sécurité" },
          { value: "logs", label: "Logs" },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === "general" && (
        <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] px-5">
          <Reglage label="Nom de la plateforme" aide="Utilisé dans les e-mails et documents générés" valeur="ProParJour" />
          <Reglage label="Ville par défaut en recherche" aide="Pré-remplissage du champ ville" valeur="Paris" />
          <Reglage label="Fuseau de facturation" aide="Horodatage des factures et exports" valeur="Europe/Paris" />
          <div className="flex items-center justify-between gap-4 py-3.5">
            <div>
              <p className="text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>Forcer la mise à jour</p>
              <p className="text-[12px] text-[var(--a-text-2)]">
                À utiliser après une mise en production — non câblé sur cette instance (pas de service worker/PWA
                dans l&apos;app à ce jour).
              </p>
            </div>
            <button
              type="button"
              disabled
              className="shrink-0 cursor-not-allowed rounded-[9px] px-4 py-[9px] text-[12.5px] font-semibold text-white opacity-50"
              style={{ background: "var(--a-accent)", fontFamily: "var(--a-font-display)" }}
            >
              Forcer
            </button>
          </div>
        </div>
      )}

      {onglet === "securite" && (
        <>
          <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] px-5">
            <Reglage label="Politique de mot de passe" aide="Politique par défaut de Supabase Auth — non renforcée côté application" valeur="—" />
            <Reglage label="Tentatives de connexion" aide="Par IP et par e-mail (src/app/actions/auth.ts)" valeur="8 puis 5 min" />
            <Reglage label="Durée des URLs signées" aide="Documents justificatifs (bucket privé)" valeur="15 minutes" />
            <Reglage label="Affichage IBAN déchiffré" aide="Masquage automatique, sans action de l'administrateur" valeur="30 secondes" />
            <div className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <p className="text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>Audit de sécurité</p>
                <p className="text-[12px] text-[var(--a-text-2)]">Dépendances, CodeQL, linter — à lancer manuellement (npm audit / CI), non exposé en un clic ici.</p>
              </div>
              <AdminBadge tone="grey">Hors app</AdminBadge>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
            <h2 className="mb-3 text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>Double authentification</h2>
            <TwoFactorSetup dejaActivee={dejaActivee2fa} />
          </div>
        </>
      )}

      {onglet === "logs" && (
        <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)]">
          <div className="a-scroll max-h-[560px] overflow-y-auto">
            {journal.length === 0 ? (
              <p className="p-8 text-center text-[13px] text-[var(--a-text-3)]">Aucune action journalisée pour l&apos;instant.</p>
            ) : (
              <div className="divide-y divide-[var(--a-border)]">
                {journal.map((l) => (
                  <div key={l.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[13px] font-bold text-[var(--a-ink)]">
                        {ACTION_LABEL[l.action] ?? l.action} — {l.cibleType} {l.cibleId.slice(0, 8)}…
                      </p>
                      <p className="text-[11.5px] text-[var(--a-text-3)]">{new Date(l.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                    <p className="mt-0.5 text-[12px] text-[var(--a-text-2)]">
                      Par {l.auteur}
                      {l.motif ? ` — motif : ${l.motif}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
