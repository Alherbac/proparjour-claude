"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Eye, Send, ShieldCheck, ShieldAlert } from "lucide-react";
import { AdminButton } from "@/components/admin/ui/button";
import { AdminInput } from "@/components/admin/ui/input";
import { AdminBadge, type AdminBadgeTone } from "@/components/admin/ui/badge";
import { AdminSection } from "@/components/admin/ui/section";
import { DOCUMENTS_REQUIS, statutAffiche } from "@/config/documents-requis";
import type { DossierKyc } from "@/lib/admin/kyc";
import {
  validerJustificatif,
  refuserJustificatif,
  validerDossier,
  refuserDossier,
  demanderDocument,
  obtenirUrlSigneeJustificatif,
} from "@/app/actions/kyc";

const METIER_LABELS: Record<string, string> = {
  securite: "Sécurité",
  accueil: "Accueil",
  vente: "Vente",
};

const STATUT_DOC_LABELS: Record<string, string> = {
  en_attente: "En attente",
  valide: "Validé",
  refuse: "Refusé",
};

const STATUT_TONE: Record<string, AdminBadgeTone> = {
  en_attente: "orange",
  partiel: "orange",
  valide: "green",
  refuse: "red",
};

const DOC_TONE: Record<string, AdminBadgeTone> = { valide: "green", en_attente: "orange", refuse: "red" };

export function KycDossierDetail({ dossier }: { dossier: DossierKyc }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [motifRefusDossier, setMotifRefusDossier] = useState("");
  const [afficherRefusDossier, setAfficherRefusDossier] = useState(false);
  const [motifsDoc, setMotifsDoc] = useState<Record<string, string>>({});
  const [afficherRefusDoc, setAfficherRefusDoc] = useState<string | null>(null);
  const [messageDemande, setMessageDemande] = useState("");
  const [afficherDemande, setAfficherDemande] = useState(false);

  const requis = DOCUMENTS_REQUIS[dossier.profil.metier] ?? [];
  const statut = statutAffiche(dossier);

  async function voirDocument(storagePath: string) {
    setErreur(null);
    const result = await obtenirUrlSigneeJustificatif(storagePath);
    if (!result.success) {
      setErreur(result.error);
      return;
    }
    window.open(result.data.url, "_blank", "noopener,noreferrer");
  }

  async function agirSurJustificatif(id: string, action: "valider" | "refuser") {
    setEnvoi(id);
    setErreur(null);
    const result =
      action === "valider"
        ? await validerJustificatif(id)
        : await refuserJustificatif(id, motifsDoc[id] ?? "");
    setEnvoi(null);
    if (!result.success) {
      setErreur(result.error);
      return;
    }
    setAfficherRefusDoc(null);
    router.refresh();
  }

  async function agirSurDossier(action: "valider" | "refuser") {
    setEnvoi("dossier");
    setErreur(null);
    const result =
      action === "valider"
        ? await validerDossier(dossier.profil.id)
        : await refuserDossier(dossier.profil.id, motifRefusDossier);
    setEnvoi(null);
    if (!result.success) {
      setErreur(result.error);
      return;
    }
    setAfficherRefusDossier(false);
    router.refresh();
  }

  async function envoyerDemande() {
    setEnvoi("demande");
    setErreur(null);
    const result = await demanderDocument(dossier.profil.id, messageDemande);
    setEnvoi(null);
    if (!result.success) {
      setErreur(result.error);
      return;
    }
    setAfficherDemande(false);
    setMessageDemande("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <AdminSection title="Dossier">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-[var(--a-ink)]">
              {dossier.user.prenom} {dossier.user.nom}
            </p>
            <p className="text-[13px] text-[var(--a-text-2)]">
              {METIER_LABELS[dossier.profil.metier]} · {dossier.profil.ville}
              {dossier.user.telephone ? ` · ${dossier.user.telephone}` : ""}
            </p>
            <p className="text-[13px] text-[var(--a-text-2)]">
              Inscrit le {new Date(dossier.profil.created_at).toLocaleDateString("fr-FR")}
            </p>
            {dossier.profil.numero_carte_cnaps && (
              <p className="mt-1 text-[13px] text-[var(--a-ink)]">
                N° carte CNAPS déclaré : {dossier.profil.numero_carte_cnaps}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {statut === "valide" ? (
              <ShieldCheck className="size-6" style={{ color: "var(--a-badge-green-text)" }} />
            ) : statut === "refuse" ? (
              <ShieldAlert className="size-6" style={{ color: "var(--a-badge-red-text)" }} />
            ) : (
              <ShieldAlert className="size-6" style={{ color: "var(--a-badge-orange-text)" }} />
            )}
            <AdminBadge tone={STATUT_TONE[statut] ?? "grey"}>
              {statut === "valide" ? "Validé" : statut === "refuse" ? "Refusé" : statut === "partiel" ? "Partiel" : "En attente"}
            </AdminBadge>
          </div>
        </div>
        {dossier.profil.motif_refus && (
          <p
            className="mt-3 rounded-[11px] px-3 py-2 text-[13px]"
            style={{ backgroundColor: "var(--a-badge-red-bg)", color: "var(--a-badge-red-text)" }}
          >
            Motif du refus : {dossier.profil.motif_refus}
          </p>
        )}
      </AdminSection>

      <AdminSection title="Documents">
        {requis.length === 0 && (
          <p className="text-[13px] text-[var(--a-text-3)]">Aucun document requis pour ce métier pour l&apos;instant.</p>
        )}
        <div className="space-y-3">
          {requis.map((r) => {
            const doc = dossier.justificatifs.find((j) => j.type_document === r.type);
            return (
              <div key={r.type} className="rounded-[11px] border border-[var(--a-border-strong)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--a-ink)]">{r.label}</p>
                    {doc ? (
                      <div className="mt-1">
                        <AdminBadge tone={DOC_TONE[doc.statut] ?? "grey"}>{STATUT_DOC_LABELS[doc.statut]}</AdminBadge>
                      </div>
                    ) : (
                      <p className="text-[12px] text-[var(--a-text-3)]">Non fourni</p>
                    )}
                  </div>
                  {doc && (
                    <div className="flex items-center gap-2">
                      <AdminButton size="sm" variant="secondary" onClick={() => voirDocument(doc.storage_path)}>
                        <Eye className="size-3.5" />
                        Voir
                      </AdminButton>
                      {doc.statut !== "valide" && (
                        <AdminButton
                          size="sm"
                          variant="success"
                          disabled={envoi === doc.id}
                          onClick={() => agirSurJustificatif(doc.id, "valider")}
                        >
                          {envoi === doc.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                          Valider
                        </AdminButton>
                      )}
                      {doc.statut !== "refuse" && (
                        <AdminButton
                          size="sm"
                          variant="danger"
                          disabled={envoi === doc.id}
                          onClick={() => setAfficherRefusDoc(afficherRefusDoc === doc.id ? null : doc.id)}
                        >
                          <XCircle className="size-3.5" />
                          Refuser
                        </AdminButton>
                      )}
                    </div>
                  )}
                </div>
                {doc?.motif_refus && doc.statut === "refuse" && (
                  <p className="mt-2 text-[12px]" style={{ color: "var(--a-badge-red-text)" }}>
                    Motif : {doc.motif_refus}
                  </p>
                )}
                {afficherRefusDoc === doc?.id && (
                  <div className="mt-2 flex gap-2">
                    <AdminInput
                      value={motifsDoc[doc.id] ?? ""}
                      onChange={(e) => setMotifsDoc((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                      placeholder="Motif du refus"
                      className="flex-1"
                    />
                    <AdminButton size="sm" variant="danger" onClick={() => agirSurJustificatif(doc.id, "refuser")}>
                      Confirmer
                    </AdminButton>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AdminSection>

      <AdminSection title="Demander un document">
        {dossier.documentDejaDemande && (
          <p className="mb-2 text-[12px]" style={{ color: "var(--a-badge-orange-text)" }}>
            Déjà contacté à ce sujet.
          </p>
        )}
        {afficherDemande ? (
          <div className="flex gap-2">
            <AdminInput
              value={messageDemande}
              onChange={(e) => setMessageDemande(e.target.value)}
              placeholder="Ex : merci de fournir une carte CNAPS lisible"
              className="flex-1"
            />
            <AdminButton size="sm" variant="secondary" disabled={envoi === "demande"} onClick={envoyerDemande}>
              {envoi === "demande" ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Envoyer
            </AdminButton>
          </div>
        ) : (
          <AdminButton size="sm" variant="secondary" onClick={() => setAfficherDemande(true)}>
            <Send className="size-3.5" />
            Demander un document
          </AdminButton>
        )}
      </AdminSection>

      <AdminSection title="Décision">
        <div className="flex flex-wrap gap-2">
          <AdminButton variant="success" disabled={envoi === "dossier"} onClick={() => agirSurDossier("valider")}>
            {envoi === "dossier" ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Valider le dossier
          </AdminButton>
          <AdminButton variant="danger" disabled={envoi === "dossier"} onClick={() => setAfficherRefusDossier((v) => !v)}>
            <XCircle className="size-3.5" />
            Refuser le dossier
          </AdminButton>
        </div>
        {afficherRefusDossier && (
          <div className="mt-3 flex gap-2">
            <AdminInput
              value={motifRefusDossier}
              onChange={(e) => setMotifRefusDossier(e.target.value)}
              placeholder="Motif du refus"
              className="flex-1"
            />
            <AdminButton size="sm" variant="danger" onClick={() => agirSurDossier("refuser")}>
              Confirmer le refus
            </AdminButton>
          </div>
        )}
        {erreur && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--a-badge-red-text)" }}>
            {erreur}
          </p>
        )}
      </AdminSection>
    </div>
  );
}
