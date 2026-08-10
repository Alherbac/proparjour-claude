"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOCUMENTS_REQUIS } from "@/config/documents-requis";
import { uploaderEtEnregistrerJustificatif } from "@/lib/justificatifs-upload";
import type { JustificatifsRow, MetierType } from "@/lib/supabase/database.types";

const STATUT_INFO: Record<string, { label: string; icon: typeof Clock; classe: string }> = {
  en_attente: { label: "En attente de vérification", icon: Clock, classe: "text-amber-600 dark:text-amber-400" },
  valide: { label: "Validé", icon: CheckCircle2, classe: "text-emerald-600 dark:text-emerald-400" },
  refuse: { label: "Refusé", icon: XCircle, classe: "text-destructive" },
};

export function MesJustificatifs({
  profilId,
  metier,
  justificatifsInitiaux,
}: {
  profilId: string;
  metier: MetierType;
  justificatifsInitiaux: JustificatifsRow[];
}) {
  const router = useRouter();
  const requis = DOCUMENTS_REQUIS[metier] ?? [];
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  if (requis.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun document requis pour votre métier pour l&apos;instant.</p>;
  }

  async function handleFichier(typeDocument: string, file: File) {
    setEnvoi(typeDocument);
    setErreur(null);
    const result = await uploaderEtEnregistrerJustificatif(profilId, typeDocument, file);
    setEnvoi(null);
    if (!result.success) {
      setErreur(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
      {requis.map((r) => {
        const doc = justificatifsInitiaux.find((j) => j.type_document === r.type);
        const info = doc ? STATUT_INFO[doc.statut] : null;
        const Icon = info?.icon;
        return (
          <div key={r.type} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{r.label}</p>
                {info && Icon && (
                  <p className={`mt-0.5 flex items-center gap-1.5 text-xs ${info.classe}`}>
                    <Icon className="size-3.5" />
                    {info.label}
                  </p>
                )}
                {!doc && <p className="mt-0.5 text-xs text-muted-foreground">Aucun document envoyé</p>}
                {doc?.statut === "refuse" && doc.motif_refus && (
                  <p className="mt-0.5 text-xs text-destructive">Motif : {doc.motif_refus}</p>
                )}
              </div>
              <input
                ref={(el) => {
                  inputRefs.current[r.type] = el;
                }}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFichier(r.type, file);
                  e.target.value = "";
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                disabled={envoi === r.type}
                onClick={() => inputRefs.current[r.type]?.click()}
              >
                {envoi === r.type ? <Loader2 className="size-3.5 animate-spin" /> : <FileUp className="size-3.5" />}
                {doc ? "Remplacer" : "Ajouter"}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
