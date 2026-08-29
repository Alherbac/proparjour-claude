"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DemandeSuppressionAvecUser } from "@/lib/admin/suppressions";
import { traiterDemandeSuppression } from "@/app/actions/suppression-compte";

function LigneDemande({ demande }: { demande: DemandeSuppressionAvecUser }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const [refusOuvert, setRefusOuvert] = useState(false);
  const [motifRefus, setMotifRefus] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  function supprimer() {
    startTransition(async () => {
      const result = await traiterDemandeSuppression(demande.id, "traitee");
      if (result.success) router.refresh();
      else setErreur(result.error);
    });
  }

  function refuser() {
    startTransition(async () => {
      const result = await traiterDemandeSuppression(demande.id, "refusee", motifRefus);
      if (result.success) router.refresh();
      else setErreur(result.error);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">
            {demande.prenom || demande.nom ? `${demande.prenom ?? ""} ${demande.nom ?? ""}`.trim() : "Utilisateur"}
          </p>
          <p className="text-sm text-muted-foreground">{demande.email ?? "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Demande du {new Date(demande.createdAt).toLocaleDateString("fr-FR")}
          </p>
          {demande.motif && <p className="mt-2 text-sm text-foreground">« {demande.motif} »</p>}
        </div>

        <div className="flex flex-col items-end gap-2">
          {!confirmationSuppression && !refusOuvert && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setRefusOuvert(true)}>
                <X className="size-3.5" />
                Refuser
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="rounded-full"
                onClick={() => setConfirmationSuppression(true)}
              >
                <Trash2 className="size-3.5" />
                Supprimer le compte
              </Button>
            </div>
          )}

          {confirmationSuppression && (
            <div className="flex flex-col items-end gap-1.5">
              <p className="text-xs text-destructive">Action irréversible — confirmer ?</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfirmationSuppression(false)}>
                  Annuler
                </Button>
                <Button size="sm" variant="destructive" className="rounded-full" disabled={pending} onClick={supprimer}>
                  Confirmer la suppression
                </Button>
              </div>
            </div>
          )}

          {refusOuvert && (
            <div className="flex flex-col items-end gap-1.5">
              <Input
                value={motifRefus}
                onChange={(e) => setMotifRefus(e.target.value)}
                placeholder="Motif du refus"
                className="h-8 w-56 text-xs"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setRefusOuvert(false)}>
                  Annuler
                </Button>
                <Button size="sm" className="rounded-full" disabled={pending} onClick={refuser}>
                  Confirmer le refus
                </Button>
              </div>
            </div>
          )}

          {erreur && <p className="text-xs text-destructive">{erreur}</p>}
        </div>
      </div>
    </div>
  );
}

export function SuppressionsScreen({ demandes }: { demandes: DemandeSuppressionAvecUser[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display-serif text-2xl text-foreground">Suppressions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Demandes de suppression de compte (droit à l&apos;oubli RGPD) en attente de traitement.
        </p>
      </div>

      {demandes.length === 0 ? (
        <p className="rounded-2xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">
          Aucune demande en attente.
        </p>
      ) : (
        <div className="space-y-3">
          {demandes.map((d) => (
            <LigneDemande key={d.id} demande={d} />
          ))}
        </div>
      )}
    </div>
  );
}
