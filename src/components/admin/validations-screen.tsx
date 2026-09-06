"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareWarning, Eye, CheckCircle2, XCircle, Send, ShieldCheck, Loader2 } from "lucide-react";
import { AdminBadge } from "@/components/admin/ui/badge";
import { AdminButton } from "@/components/admin/ui/button";
import { AdminInput } from "@/components/admin/ui/input";
import { cn } from "@/lib/utils";
import { statutAffiche, type StatutAffiche } from "@/config/documents-requis";
import type { DossierKyc, VerificationAuto } from "@/lib/admin/kyc";
import {
  chargerDetailKyc,
  reveleIbanDossier,
  validerJustificatif,
  refuserJustificatif,
  validerDossier,
  refuserDossier,
  demanderDocument,
  obtenirUrlSigneeJustificatif,
} from "@/app/actions/kyc";
import { masquerIban, formaterIban } from "@/lib/iban";

const METIER_LABELS: Record<string, string> = { securite: "Sécurité", accueil: "Accueil", vente: "Vente" };

type FiltreValeur = "en_attente" | "partiel" | "refuse" | "tous";

const FILTRES: { value: FiltreValeur; label: string }[] = [
  { value: "en_attente", label: "En attente" },
  { value: "partiel", label: "Partiel" },
  { value: "refuse", label: "Refusé" },
  { value: "tous", label: "Tous" },
];

const STATUT_TONE: Record<StatutAffiche, "orange" | "green" | "red"> = {
  en_attente: "orange",
  partiel: "orange",
  valide: "green",
  refuse: "red",
};
const STATUT_LABEL: Record<StatutAffiche, string> = {
  en_attente: "En attente",
  partiel: "Partiel",
  valide: "Validé",
  refuse: "Refusé",
};
const DOC_TONE: Record<string, "green" | "orange" | "red"> = { valide: "green", en_attente: "orange", refuse: "red" };

function joursAttente(dateIso: string) {
  return Math.floor((Date.now() - new Date(dateIso).getTime()) / 86_400_000);
}

export function ValidationsScreen({ dossiers }: { dossiers: DossierKyc[] }) {
  const router = useRouter();
  const [filtre, setFiltre] = useState<FiltreValeur>("en_attente");
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ dossier: DossierKyc; verifications: VerificationAuto[]; credibilite: number } | null>(null);
  const [chargement, setChargement] = useState(false);

  const compteurs = {
    en_attente: dossiers.filter((d) => statutAffiche(d) === "en_attente").length,
    partiel: dossiers.filter((d) => statutAffiche(d) === "partiel").length,
    refuse: dossiers.filter((d) => statutAffiche(d) === "refuse").length,
    tous: dossiers.length,
  };
  const filtres = filtre === "tous" ? dossiers : dossiers.filter((d) => statutAffiche(d) === filtre);
  const plusAncien = dossiers
    .filter((d) => statutAffiche(d) !== "valide" && statutAffiche(d) !== "refuse")
    .reduce<number | null>((max, d) => {
      const j = joursAttente(d.profil.created_at);
      return max === null || j > max ? j : max;
    }, null);

  async function ouvrir(profilId: string) {
    setSelectionId(profilId);
    setChargement(true);
    setDetail(null);
    const result = await chargerDetailKyc(profilId);
    setChargement(false);
    if (result.success) setDetail(result.data);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
          Validation des profils
        </h1>
        <p className="mt-1.5 max-w-3xl text-[13px] text-[var(--a-text-2)]">
          Les personnes déjà inscrites sur ProParJour qui attendent la validation de leur dossier. Tant qu&apos;un
          dossier n&apos;est pas validé, le profil reste invisible en recherche et ne peut recevoir aucune mission.
          Les exigences documentaires viennent de la base, jamais du code.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <p className="a-tabular text-[22px] font-extrabold" style={{ fontFamily: "var(--a-font-display)", color: "var(--a-accent)" }}>
            {compteurs.en_attente}
          </p>
          <p className="text-[11.5px] text-[var(--a-text-2)]">dossiers en attente</p>
        </div>
        <div>
          <p className="a-tabular text-[22px] font-extrabold" style={{ fontFamily: "var(--a-font-display)", color: "var(--a-orange)" }}>
            {compteurs.partiel}
          </p>
          <p className="text-[11.5px] text-[var(--a-text-2)]">partiellement validés</p>
        </div>
        <div>
          <p className="a-tabular text-[22px] font-extrabold" style={{ fontFamily: "var(--a-font-display)", color: "var(--a-badge-red-text)" }}>
            {compteurs.refuse}
          </p>
          <p className="text-[11.5px] text-[var(--a-text-2)]">refusés à revoir</p>
        </div>
        <div>
          <p className="a-tabular text-[22px] font-extrabold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
            {plusAncien !== null ? `${plusAncien} j` : "—"}
          </p>
          <p className="text-[11.5px] text-[var(--a-text-2)]">attente la plus ancienne</p>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0, 1fr) 380px" }}>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTRES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFiltre(f.value)}
                className={cn(
                  "rounded-[9px] border px-3 py-[7px] text-[12px] font-semibold transition-colors",
                  filtre === f.value
                    ? "border-[var(--a-accent)] bg-[var(--a-accent)] text-white"
                    : "border-[var(--a-border-strong)] text-[var(--a-ink)] hover:border-[var(--a-accent)]/50",
                )}
                style={{ fontFamily: "var(--a-font-display)" }}
              >
                {f.label} ({compteurs[f.value]})
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {filtres.map((d) => {
              const statut = statutAffiche(d);
              return (
                <button
                  key={d.profil.id}
                  type="button"
                  onClick={() => ouvrir(d.profil.id)}
                  className={cn(
                    "flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition-colors",
                    selectionId === d.profil.id ? "border-[var(--a-accent)]" : "border-[var(--a-border)] hover:border-[var(--a-border-strong)]",
                  )}
                  style={{ background: "var(--a-surface)" }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                      style={{ background: "var(--a-accent)", fontFamily: "var(--a-font-display)" }}
                    >
                      {(d.user.prenom?.charAt(0) ?? "?").toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
                        {d.user.prenom} {d.user.nom}
                      </p>
                      <p className="text-[12px] text-[var(--a-text-2)]">
                        {METIER_LABELS[d.profil.metier]} · {d.profil.ville} · depuis {joursAttente(d.profil.created_at)} j
                      </p>
                    </div>
                    <AdminBadge tone={STATUT_TONE[statut]}>{STATUT_LABEL[statut]}</AdminBadge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pl-[46px]">
                    {d.justificatifs.map((j) => (
                      <AdminBadge key={j.id} tone={DOC_TONE[j.statut] ?? "grey"}>
                        {j.type_document}
                      </AdminBadge>
                    ))}
                    {d.documentDejaDemande && (
                      <span title="Document déjà demandé">
                        <MessageSquareWarning className="size-3.5 text-[var(--a-orange)]" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {filtres.length === 0 && <p className="py-10 text-center text-[13px] text-[var(--a-text-3)]">Rien ici pour l&apos;instant.</p>}
          </div>
        </div>

        <div className="sticky top-6 h-fit space-y-3">
          {!selectionId && (
            <div className="rounded-2xl border border-dashed border-[var(--a-border-strong)] p-6 text-center text-[13px] text-[var(--a-text-3)]">
              Sélectionnez un dossier pour voir les vérifications et décider.
            </div>
          )}
          {selectionId && chargement && (
            <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-6 text-center text-[13px] text-[var(--a-text-3)]">
              <Loader2 className="mx-auto mb-2 size-4 animate-spin" />
              Chargement…
            </div>
          )}
          {selectionId && !chargement && detail && (
            <DecisionColonne
              key={detail.dossier.profil.id}
              detail={detail}
              onMisAJour={() => {
                router.refresh();
                ouvrir(detail.dossier.profil.id);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DecisionColonne({
  detail,
  onMisAJour,
}: {
  detail: { dossier: DossierKyc; verifications: VerificationAuto[]; credibilite: number };
  onMisAJour: () => void;
}) {
  const { dossier, verifications, credibilite } = detail;
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [motifRefusDossier, setMotifRefusDossier] = useState("");
  const [afficherRefusDossier, setAfficherRefusDossier] = useState(false);
  const [motifsDoc, setMotifsDoc] = useState<Record<string, string>>({});
  const [afficherRefusDoc, setAfficherRefusDoc] = useState<string | null>(null);
  const [messageDemande, setMessageDemande] = useState("");
  const [afficherDemande, setAfficherDemande] = useState(false);
  const [iban, setIban] = useState<{ iban: string | null; bic: string | null } | null>(null);
  const [revele, setRevele] = useState(false);

  useEffect(() => {
    if (!revele) return;
    const t = setTimeout(() => setRevele(false), 30_000);
    return () => clearTimeout(t);
  }, [revele]);

  function agir(fn: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        setErreur(result.error ?? "Une erreur est survenue.");
        return;
      }
      setErreur(null);
      onMisAJour();
    });
  }

  async function reveler() {
    const result = await reveleIbanDossier(dossier.profil.id);
    if (result.success) {
      setIban(result.data);
      setRevele(true);
    }
  }

  async function voirDocument(storagePath: string) {
    const result = await obtenirUrlSigneeJustificatif(storagePath);
    if (result.success) window.open(result.data.url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
        <h2 className="mb-2 text-[12.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
          Vérifications automatiques
        </h2>
        <div className="space-y-2">
          {verifications.map((v) => (
            <div key={v.label} className="flex items-start gap-2">
              <span
                className="mt-1 size-[6px] shrink-0 rounded-full"
                style={{ background: v.ok ? "var(--a-green)" : "var(--a-orange)" }}
              />
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-[var(--a-ink)]">{v.label}</p>
                <p className="text-[11.5px] text-[var(--a-text-2)]">{v.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[var(--a-border)] pt-3">
          <span className="text-[12px] font-semibold text-[var(--a-text-2)]">Crédibilité</span>
          <AdminBadge tone="gold">{credibilite}/100</AdminBadge>
        </div>
        {dossier.documentDejaDemande && (
          <div className="mt-2">
            <AdminBadge tone="blue">Déjà contacté</AdminBadge>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
        <h2 className="mb-2 text-[12.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
          Aperçu sécurisé
        </h2>
        <p className="mb-3 text-[11.5px] text-[var(--a-text-2)]">
          Les pièces s&apos;ouvrent par URL signée valable 15 minutes. L&apos;IBAN est affiché à la demande et
          masqué après 30 secondes.
        </p>
        <div className="space-y-1.5">
          {dossier.justificatifs.map((j) => (
            <div key={j.id} className="flex items-center justify-between text-[12.5px]">
              <span className="min-w-0 truncate text-[var(--a-ink)]">{j.type_document}</span>
              <button
                type="button"
                onClick={() => voirDocument(j.storage_path)}
                className="flex shrink-0 items-center gap-1 font-semibold"
                style={{ color: "var(--a-accent)" }}
              >
                <Eye className="size-3.5" />
                Voir
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-[var(--a-border)] pt-3">
          <div>
            <span className="a-tabular block text-[12.5px] font-semibold text-[var(--a-ink)]">
              {revele && iban?.iban ? formaterIban(iban.iban) : iban === null ? "IBAN non renseigné" : masquerIban(iban.iban ?? "")}
            </span>
            {!revele && iban?.iban && <span className="text-[11px] font-semibold text-[var(--a-orange)]">masqué</span>}
          </div>
          <AdminButton size="sm" variant="secondary" onClick={reveler}>
            Déchiffrer 30 s
          </AdminButton>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
        <h2 className="mb-2 text-[12.5px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
          Décision
        </h2>

        <div className="mb-3 space-y-2 border-b border-[var(--a-border)] pb-3">
          {dossier.justificatifs.map((j) => (
            <div key={j.id} className="rounded-[10px] border border-[var(--a-border)] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[12px] font-semibold text-[var(--a-ink)]">{j.type_document}</span>
                <AdminBadge tone={DOC_TONE[j.statut] ?? "grey"}>{j.statut}</AdminBadge>
              </div>
              <div className="mt-1.5 flex gap-1.5">
                {j.statut !== "valide" && (
                  <AdminButton size="sm" variant="success" disabled={isPending} onClick={() => agir(() => validerJustificatif(j.id))}>
                    <CheckCircle2 className="size-3" /> Valider
                  </AdminButton>
                )}
                {j.statut !== "refuse" && (
                  <AdminButton
                    size="sm"
                    variant="danger"
                    onClick={() => setAfficherRefusDoc(afficherRefusDoc === j.id ? null : j.id)}
                  >
                    <XCircle className="size-3" /> Refuser
                  </AdminButton>
                )}
              </div>
              {afficherRefusDoc === j.id && (
                <div className="mt-1.5 flex gap-1.5">
                  <AdminInput
                    value={motifsDoc[j.id] ?? ""}
                    onChange={(e) => setMotifsDoc((prev) => ({ ...prev, [j.id]: e.target.value }))}
                    placeholder="Motif"
                    className="h-8 text-[12px]"
                  />
                  <AdminButton size="sm" variant="danger" onClick={() => agir(() => refuserJustificatif(j.id, motifsDoc[j.id] ?? ""))}>
                    OK
                  </AdminButton>
                </div>
              )}
            </div>
          ))}
        </div>

        {afficherDemande ? (
          <div className="mb-3 flex gap-1.5">
            <AdminInput value={messageDemande} onChange={(e) => setMessageDemande(e.target.value)} placeholder="Message au prestataire" />
            <AdminButton size="sm" variant="secondary" disabled={isPending} onClick={() => agir(() => demanderDocument(dossier.profil.id, messageDemande))}>
              <Send className="size-3.5" />
            </AdminButton>
          </div>
        ) : (
          <AdminButton size="sm" variant="secondary" className="mb-3 w-full" onClick={() => setAfficherDemande(true)}>
            <Send className="size-3.5" /> Demander un document
          </AdminButton>
        )}

        <div className="space-y-2">
          <AdminButton variant="success" className="w-full" disabled={isPending} onClick={() => agir(() => validerDossier(dossier.profil.id))}>
            <ShieldCheck className="size-3.5" /> Valider le dossier
          </AdminButton>
          <AdminButton variant="danger" className="w-full" onClick={() => setAfficherRefusDossier((v) => !v)}>
            <XCircle className="size-3.5" /> Refuser avec motif
          </AdminButton>
          {afficherRefusDossier && (
            <div className="flex gap-1.5">
              <AdminInput value={motifRefusDossier} onChange={(e) => setMotifRefusDossier(e.target.value)} placeholder="Motif du refus (obligatoire)" />
              <AdminButton size="sm" variant="danger" disabled={isPending} onClick={() => agir(() => refuserDossier(dossier.profil.id, motifRefusDossier))}>
                OK
              </AdminButton>
            </div>
          )}
        </div>
        <p className="mt-3 text-[11px] text-[var(--a-text-3)]">
          Le motif de refus part par e-mail au prestataire. Vous pouvez forcer un statut malgré une vérification en
          échec.
        </p>
        {erreur && <p className="mt-2 text-[12.5px] text-[var(--a-badge-red-text)]">{erreur}</p>}
      </div>
    </>
  );
}
