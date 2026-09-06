"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminH1 } from "@/components/admin/ui/section";
import { AdminTabs } from "@/components/admin/ui/tabs";
import { AdminBadge } from "@/components/admin/ui/badge";
import { AdminTableShell, AdminTh, AdminTr, AdminTd } from "@/components/admin/ui/table-shell";
import type { ConversationAdmin, EnvoiAdmin } from "@/lib/admin/messages";

function ilYA(iso: string) {
  const jours = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (jours === 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  return `il y a ${jours} j`;
}

function estActif(iso: string) {
  return Date.now() - new Date(iso).getTime() < 2 * 86_400_000;
}

export function MessagesScreen({ conversations, historique }: { conversations: ConversationAdmin[]; historique: EnvoiAdmin[] }) {
  const [onglet, setOnglet] = useState<"conversations" | "historique">("conversations");

  return (
    <div className="space-y-5">
      <div>
        <AdminH1>Messages</AdminH1>
        <p className="mt-1 text-[13px] text-[var(--a-text-2)]">
          Les coordonnées personnelles restent masquées côté utilisateur jusqu&apos;à la validation de la mission.
        </p>
      </div>

      <AdminTabs
        tabs={[
          { value: "conversations", label: "Conversations" },
          { value: "historique", label: "Historique" },
        ]}
        actif={onglet}
        onChange={setOnglet}
      />

      {onglet === "conversations" ? (
        conversations.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--a-border-strong)] py-10 text-center text-[13px] text-[var(--a-text-3)]">
            Aucune conversation pour l&apos;instant.
          </p>
        ) : (
          <div className="space-y-2.5">
            {conversations.map((c) => {
              const actif = estActif(c.dernierMessageLe);
              return (
                <Link
                  key={c.missionId}
                  href={`/admin/messages/${c.missionId}`}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4 transition-colors hover:border-[var(--a-border-strong)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
                        {c.recruteurNom} ↔ Prestataire
                      </p>
                      <AdminBadge tone={actif ? "green" : "grey"}>{actif ? "Actif" : "Inactif"}</AdminBadge>
                    </div>
                    <p className="truncate text-[12.5px] text-[var(--a-text-2)]">{c.lieu}</p>
                    <p className="truncate text-[12.5px] text-[var(--a-text-3)]">{c.dernierMessage}</p>
                  </div>
                  <div className="shrink-0 text-right text-[11.5px] text-[var(--a-text-3)]">
                    <p>{ilYA(c.dernierMessageLe)}</p>
                    <p>{c.nbMessages} message{c.nbMessages > 1 ? "s" : ""}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : historique.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--a-border-strong)] py-10 text-center text-[13px] text-[var(--a-text-3)]">
          Aucun envoi administrateur pour l&apos;instant.
        </p>
      ) : (
        <AdminTableShell minWidth={880}>
          <table className="w-full">
            <thead>
              <tr>
                <AdminTh>Destinataire</AdminTh>
                <AdminTh>Objet</AdminTh>
                <AdminTh>Canal</AdminTh>
                <AdminTh>Date</AdminTh>
              </tr>
            </thead>
            <tbody>
              {historique.map((h, i) => (
                <AdminTr key={i}>
                  <AdminTd truncate>{h.destinataire}</AdminTd>
                  <AdminTd truncate>{h.objet}</AdminTd>
                  <AdminTd>
                    <AdminBadge tone="blue">Notification</AdminBadge>
                  </AdminTd>
                  <AdminTd truncate>{new Date(h.createdAt).toLocaleString("fr-FR")}</AdminTd>
                </AdminTr>
              ))}
            </tbody>
          </table>
        </AdminTableShell>
      )}
    </div>
  );
}
