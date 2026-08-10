"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Eye, Send, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
      <h2 className="font-heading text-lg font-semibold text-foreground">{titre}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

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
      <Section titre="Dossier">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">
              {dossier.user.prenom} {dossier.user.nom}
            </p>
            <p className="text-sm text-muted-foreground">
              {METIER_LABELS[dossier.profil.metier]} · {dossier.profil.ville}
              {dossier.user.telephone ? ` · ${dossier.user.telephone}` : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              Inscrit le {new Date(dossier.profil.created_at).toLocaleDateString("fr-FR")}
            </p>
            {dossier.profil.numero_carte_cnaps && (
              <p className="mt-1 text-sm text-foreground">
                N° carte CNAPS déclaré : {dossier.profil.numero_carte_cnaps}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {statut === "valide" ? (
              <ShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
            ) : statut === "refuse" ? (
              <ShieldAlert className="size-6 text-destructive" />
            ) : (
              <ShieldAlert className="size-6 text-amber-600 dark:text-amber-400" />
            )}
            <Badge variant="secondary" className="font-normal">
              {statut === "valide" ? "Validé" : statut === "refuse" ? "Refusé" : statut === "partiel" ? "Partiel" : "En attente"}
            </Badge>
          </div>
        </div>
        {dossier.profil.motif_refus && (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Motif du refus : {dossier.profil.motif_refus}
          </p>
        )}
      </Section>

      <Section titre="Documents">
        {requis.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun document requis pour ce métier pour l&apos;instant.</p>
        )}
        <div className="space-y-3">
          {requis.map((r) => {
            const doc = dossier.justificatifs.find((j) => j.type_document === r.type);
            return (
              <div key={r.type} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc ? STATUT_DOC_LABELS[doc.statut] : "Non fourni"}
                    </p>
                  </div>
                  {doc && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => voirDocument(doc.storage_path)}>
                        <Eye className="size-3.5" />
                        Voir
                      </Button>
                      {doc.statut !== "valide" && (
                        <Button
                          size="sm"
                          className="rounded-full"
                          disabled={envoi === doc.id}
                          onClick={() => agirSurJustificatif(doc.id, "valider")}
                        >
                          {envoi === doc.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                          Valider
                        </Button>
                      )}
                      {doc.statut !== "refuse" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full text-destructive hover:text-destructive"
                          disabled={envoi === doc.id}
                          onClick={() => setAfficherRefusDoc(afficherRefusDoc === doc.id ? null : doc.id)}
                        >
                          <XCircle className="size-3.5" />
                          Refuser
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {doc?.motif_refus && doc.statut === "refuse" && (
                  <p className="mt-2 text-xs text-destructive">Motif : {doc.motif_refus}</p>
                )}
                {afficherRefusDoc === doc?.id && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={motifsDoc[doc.id] ?? ""}
                      onChange={(e) => setMotifsDoc((prev) => ({ ...prev, [doc.id]: e.target.value }))}
                      placeholder="Motif du refus"
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" className="rounded-full text-destructive" onClick={() => agirSurJustificatif(doc.id, "refuser")}>
                      Confirmer
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section titre="Demander un document">
        {dossier.documentDejaDemande && (
          <p className="mb-2 text-xs text-amber-600 dark:text-amber-400">Déjà contacté à ce sujet.</p>
        )}
        {afficherDemande ? (
          <div className="flex gap-2">
            <Input
              value={messageDemande}
              onChange={(e) => setMessageDemande(e.target.value)}
              placeholder="Ex : merci de fournir une carte CNAPS lisible"
              className="flex-1"
            />
            <Button size="sm" className="rounded-full" disabled={envoi === "demande"} onClick={envoyerDemande}>
              {envoi === "demande" ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Envoyer
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setAfficherDemande(true)}>
            <Send className="size-3.5" />
            Demander un document
          </Button>
        )}
      </Section>

      <Section titre="Décision">
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-full" disabled={envoi === "dossier"} onClick={() => agirSurDossier("valider")}>
            {envoi === "dossier" ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Valider le dossier
          </Button>
          <Button
            variant="outline"
            className={cn("rounded-full text-destructive hover:text-destructive")}
            disabled={envoi === "dossier"}
            onClick={() => setAfficherRefusDossier((v) => !v)}
          >
            <XCircle className="size-3.5" />
            Refuser le dossier
          </Button>
        </div>
        {afficherRefusDossier && (
          <div className="mt-3 flex gap-2">
            <Input
              value={motifRefusDossier}
              onChange={(e) => setMotifRefusDossier(e.target.value)}
              placeholder="Motif du refus"
              className="flex-1"
            />
            <Button size="sm" variant="outline" className="rounded-full text-destructive" onClick={() => agirSurDossier("refuser")}>
              Confirmer le refus
            </Button>
          </div>
        )}
        {erreur && <p className="mt-2 text-sm text-destructive">{erreur}</p>}
      </Section>
    </div>
  );
}
