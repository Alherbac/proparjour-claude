"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Ban, CheckCircle2, Send, FileText, ShieldOff } from "lucide-react";
import { AdminInput, AdminTextarea } from "@/components/admin/ui/input";
import { AdminButton } from "@/components/admin/ui/button";
import { AdminBadge } from "@/components/admin/ui/badge";
import { AdminTableShell, AdminTh, AdminTr, AdminTd } from "@/components/admin/ui/table-shell";
import { SidePanel } from "@/components/admin/side-panel";
import { cn } from "@/lib/utils";
import type { UtilisateurListe, FicheUtilisateur } from "@/lib/admin/utilisateurs";
import {
  suspendreUtilisateur,
  reactiverUtilisateur,
  chargerFicheUtilisateur,
  envoyerMessageAdminUtilisateur,
} from "@/app/actions/admin-utilisateurs";

const TYPE_LABEL: Record<string, string> = {
  prestataire: "Prestataire",
  recruteur_particulier: "Client particulier",
  recruteur_entreprise: "Client entreprise",
};

const DOC_STATUT: Record<string, { tone: "green" | "orange" | "red" | "grey"; label: string }> = {
  valide: { tone: "green", label: "Validé" },
  en_attente: { tone: "orange", label: "En attente" },
  refuse: { tone: "red", label: "Refusé" },
  non_fourni: { tone: "grey", label: "Non fourni" },
};

function nomComplet(u: { prenom: string | null; nom: string | null }) {
  return [u.prenom, u.nom].filter(Boolean).join(" ") || "—";
}

function FichePanelContent({ fiche, peutAgir }: { fiche: FicheUtilisateur; peutAgir: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ecrireOuvert, setEcrireOuvert] = useState(false);
  const [sujet, setSujet] = useState("");
  const [contenu, setContenu] = useState("");
  const [confirmerSuspension, setConfirmerSuspension] = useState(false);
  const [motifSuspension, setMotifSuspension] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  function envoyer() {
    startTransition(async () => {
      const result = await envoyerMessageAdminUtilisateur(fiche.id, sujet, contenu);
      if (!result.success) {
        setErreur(result.error);
        return;
      }
      setEcrireOuvert(false);
      setSujet("");
      setContenu("");
      router.refresh();
    });
  }

  function agirSuspension() {
    startTransition(async () => {
      const result = fiche.suspendu
        ? await reactiverUtilisateur(fiche.id)
        : await suspendreUtilisateur(fiche.id, motifSuspension);
      if (!result.success) {
        setErreur(result.error);
        return;
      }
      setConfirmerSuspension(false);
      router.refresh();
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-5">
        <div className="flex items-start gap-3">
          <span
            className="flex size-[42px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white"
            style={{ background: "var(--a-accent)", fontFamily: "var(--a-font-display)" }}
          >
            {(fiche.prenom?.charAt(0) ?? fiche.nom?.charAt(0) ?? "?").toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
              {nomComplet(fiche)}
            </p>
            <p className="text-[12.5px] text-[var(--a-text-2)]">
              {fiche.type ? TYPE_LABEL[fiche.type] ?? fiche.type : "—"} · {fiche.ville ?? "Ville non renseignée"}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <AdminBadge tone={fiche.suspendu ? "red" : "green"}>{fiche.suspendu ? "Suspendu" : "Actif"}</AdminBadge>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10.5px] font-bold tracking-[0.12em] text-[var(--a-text-3)] uppercase" style={{ fontFamily: "var(--a-font-display)" }}>
            Coordonnées
          </p>
          <div className="space-y-1 text-[13px]">
            <p><span className="text-[var(--a-text-2)]">E-mail : </span>{fiche.email ?? "—"}</p>
            <p><span className="text-[var(--a-text-2)]">Téléphone : </span>{fiche.telephone ?? "—"}</p>
            <p><span className="text-[var(--a-text-2)]">Inscription : </span>{new Date(fiche.createdAt).toLocaleDateString("fr-FR")}</p>
          </div>
        </div>

        {fiche.type === "prestataire" && (
          <div>
            <p className="mb-1.5 text-[10.5px] font-bold tracking-[0.12em] text-[var(--a-text-3)] uppercase" style={{ fontFamily: "var(--a-font-display)" }}>
              Documents
            </p>
            {fiche.documents.length === 0 ? (
              <p className="text-[13px] text-[var(--a-text-3)]">Aucun document requis pour ce métier.</p>
            ) : (
              <div className="space-y-1.5">
                {fiche.documents.map((d) => (
                  <div key={d.type} className="flex items-center justify-between text-[13px]">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-[var(--a-ink)]">
                      <FileText className="size-3.5 shrink-0 text-[var(--a-text-3)]" />
                      {d.label}
                    </span>
                    <AdminBadge tone={DOC_STATUT[d.statut]?.tone ?? "grey"}>{DOC_STATUT[d.statut]?.label ?? d.statut}</AdminBadge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <p className="mb-1.5 text-[10.5px] font-bold tracking-[0.12em] text-[var(--a-text-3)] uppercase" style={{ fontFamily: "var(--a-font-display)" }}>
            Messages administrateur
          </p>
          {fiche.messages.length === 0 ? (
            <p className="text-[13px] text-[var(--a-text-3)]">Aucun message envoyé à ce compte.</p>
          ) : (
            <div className="space-y-2.5">
              {fiche.messages.map((m, i) => (
                <div key={i} className="border-b border-[var(--a-border)] pb-2 last:border-0">
                  <p className="text-[13px] font-semibold text-[var(--a-ink)]">{m.titre}</p>
                  {m.contenu && <p className="mt-0.5 text-[12.5px] text-[var(--a-text-2)]">{m.contenu}</p>}
                  <p className="mt-0.5 text-[11px] text-[var(--a-text-3)]">
                    {new Date(m.createdAt).toLocaleDateString("fr-FR")} · notification in-app
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {ecrireOuvert && (
          <div className="space-y-2 rounded-[12px] border border-[var(--a-border)] p-3">
            <AdminInput value={sujet} onChange={(e) => setSujet(e.target.value)} placeholder="Sujet" />
            <AdminTextarea value={contenu} onChange={(e) => setContenu(e.target.value)} placeholder="Message (optionnel)" rows={3} />
            <div className="flex gap-2">
              <AdminButton size="sm" variant="primary" disabled={isPending} onClick={envoyer}>
                Envoyer
              </AdminButton>
              <AdminButton size="sm" variant="ghost" onClick={() => setEcrireOuvert(false)}>
                Annuler
              </AdminButton>
            </div>
          </div>
        )}
        {confirmerSuspension && (
          <div className="space-y-2 rounded-[12px] border border-[rgba(224,90,58,0.34)] bg-[var(--a-badge-red-bg)] p-3">
            <AdminInput value={motifSuspension} onChange={(e) => setMotifSuspension(e.target.value)} placeholder="Motif (obligatoire)" />
            <div className="flex gap-2">
              <AdminButton size="sm" variant="danger" disabled={isPending} onClick={agirSuspension}>
                Confirmer la suspension
              </AdminButton>
              <AdminButton size="sm" variant="ghost" onClick={() => setConfirmerSuspension(false)}>
                Annuler
              </AdminButton>
            </div>
          </div>
        )}
        {erreur && <p className="text-[12.5px] text-[var(--a-badge-red-text)]">{erreur}</p>}
      </div>

      {peutAgir && (
        <div className="mt-4 shrink-0 space-y-2 border-t border-[var(--a-border)] pt-4">
          <div className="flex gap-2">
            <AdminButton variant="primary" className="flex-1" onClick={() => setEcrireOuvert((v) => !v)}>
              <Send className="size-3.5" />
              Envoyer un e-mail
            </AdminButton>
          </div>
          <div className="flex gap-2">
            {fiche.suspendu ? (
              <AdminButton variant="success" className="flex-1" disabled={isPending} onClick={agirSuspension}>
                <CheckCircle2 className="size-3.5" />
                Réactiver
              </AdminButton>
            ) : (
              <AdminButton variant="danger" className="flex-1" onClick={() => setConfirmerSuspension((v) => !v)}>
                <Ban className="size-3.5" />
                Suspendre
              </AdminButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function UtilisateursScreen({
  utilisateurs,
  total,
  totalPages,
  page,
  q,
  type,
  role,
}: {
  utilisateurs: UtilisateurListe[];
  total: number;
  totalPages: number;
  page: number;
  q: string;
  type: string;
  role: "admin" | "moderator";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [recherche, setRecherche] = useState(q);
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [fiche, setFiche] = useState<FicheUtilisateur | null>(null);
  const [chargement, setChargement] = useState(false);

  function appliquerFiltres(next: { q?: string; type?: string; page?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.type !== undefined) {
      if (next.type && next.type !== "tous") params.set("type", next.type);
      else params.delete("type");
    }
    if (next.page !== undefined && next.page > 1) params.set("page", String(next.page));
    else params.delete("page");
    router.push(`/admin/utilisateurs?${params.toString()}`);
  }

  async function ouvrirLigne(userId: string) {
    setSelectionId(userId);
    setChargement(true);
    setFiche(null);
    const result = await chargerFicheUtilisateur(userId);
    setChargement(false);
    if (result.success) setFiche(result.data);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-t-2xl px-[22px] pt-5 pb-5" style={{ background: "var(--a-nav-bg)" }}>
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-white" style={{ fontFamily: "var(--a-font-display)" }}>
          Utilisateurs ({total})
        </h1>
        <p className="mt-1 text-[12.5px] text-[var(--a-nav-text)]">Cliquez une ligne pour ouvrir le détail sans quitter la liste.</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              appliquerFiltres({ q: recherche, page: 1 });
            }}
            className="relative"
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--a-nav-text)]" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un nom, un e-mail, un téléphone…"
              className="h-[38px] w-72 rounded-[11px] border pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-[var(--a-nav-text)] focus:border-[var(--a-accent)]"
              style={{ background: "var(--a-nav-field)", borderColor: "var(--a-nav-field-border)" }}
            />
          </form>
          {(["tous", "prestataire", "recruteur_entreprise", "recruteur_particulier"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => appliquerFiltres({ type: t, page: 1 })}
              className={cn(
                "shrink-0 rounded-[9px] px-3 py-[7px] text-[12px] font-semibold transition-colors",
                (type || "tous") === t ? "text-white" : "text-[var(--a-nav-text)] hover:text-white",
              )}
              style={{ background: (type || "tous") === t ? "var(--a-accent)" : "transparent", fontFamily: "var(--a-font-display)" }}
            >
              {t === "tous" ? "Tous" : TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      </div>

      <AdminTableShell minWidth={880} className="-mt-4 rounded-t-none">
        <table className="w-full">
          <thead>
            <tr>
              <AdminTh>Compte</AdminTh>
              <AdminTh>Rôle</AdminTh>
              <AdminTh>Ville</AdminTh>
              <AdminTh>Statut</AdminTh>
              <AdminTh>Inscription</AdminTh>
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => (
              <AdminTr key={u.id} onClick={() => ouvrirLigne(u.id)} active={selectionId === u.id}>
                <AdminTd>
                  <p className="font-bold text-[var(--a-ink)]">{nomComplet(u)}</p>
                  <p className="text-[12px] text-[var(--a-text-2)]">{u.email ?? "—"}</p>
                </AdminTd>
                <AdminTd truncate>{u.type ? TYPE_LABEL[u.type] ?? u.type : "—"}</AdminTd>
                <AdminTd truncate>{u.ville ?? "—"}</AdminTd>
                <AdminTd>
                  <AdminBadge tone={u.suspendu ? "red" : "green"}>{u.suspendu ? "Suspendu" : "Actif"}</AdminBadge>
                </AdminTd>
                <AdminTd truncate>{new Date(u.createdAt).toLocaleDateString("fr-FR")}</AdminTd>
              </AdminTr>
            ))}
            {utilisateurs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[13px] text-[var(--a-text-3)]">
                  Aucun utilisateur trouvé.
                  <ShieldOff className="mx-auto mt-2 size-5 text-[var(--a-text-3)]" />
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
              onClick={() => appliquerFiltres({ page: p })}
              className={cn(
                "flex size-8 items-center justify-center rounded-[9px] border text-[12.5px] font-semibold",
                p === page
                  ? "border-[var(--a-accent)] bg-[var(--a-accent)] text-white"
                  : "border-[var(--a-border-strong)] text-[var(--a-ink)] hover:border-[var(--a-accent)]/50",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <SidePanel titre="Détail du compte" ouvert={selectionId !== null} onFermer={() => setSelectionId(null)}>
        {chargement && <p className="text-[13px] text-[var(--a-text-3)]">Chargement…</p>}
        {!chargement && fiche && <FichePanelContent fiche={fiche} peutAgir={role === "admin"} />}
        {!chargement && !fiche && selectionId && <p className="text-[13px] text-[var(--a-text-3)]">Compte introuvable.</p>}
      </SidePanel>
    </div>
  );
}
