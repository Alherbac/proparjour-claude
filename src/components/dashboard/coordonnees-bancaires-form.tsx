"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Landmark, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { modifierCoordonneesBancaires } from "@/app/actions/compte";
import { formaterIban, masquerIban } from "@/lib/iban";

export function CoordonneesBancairesForm({
  ibanInitial,
  bicInitial,
}: {
  ibanInitial: string | null;
  bicInitial: string | null;
}) {
  const [modification, setModification] = useState(!ibanInitial);
  const [iban, setIban] = useState(ibanInitial ? formaterIban(ibanInitial) : "");
  const [bic, setBic] = useState(bicInitial ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function enregistrer() {
    setErreur(null);
    startTransition(async () => {
      const result = await modifierCoordonneesBancaires(iban, bic);
      if (!result.success) {
        setErreur(result.error);
        return;
      }
      toast.success("RIB enregistré.");
      setModification(false);
    });
  }

  if (!modification && ibanInitial) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
        <div className="flex items-center gap-2.5">
          <Landmark className="size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-mono text-sm text-foreground">{masquerIban(ibanInitial)}</p>
            {bicInitial && <p className="text-xs text-muted-foreground">{bicInitial}</p>}
          </div>
        </div>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setModification(true)}>
          Modifier
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Ce RIB sera utilisé pour vous reverser le paiement une fois une mission validée.
      </p>
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">IBAN</label>
        <Input
          value={iban}
          onChange={(e) => setIban(e.target.value)}
          placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
          className="font-mono uppercase"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">BIC / SWIFT</label>
        <Input
          value={bic}
          onChange={(e) => setBic(e.target.value)}
          placeholder="XXXXXXXX"
          className="font-mono uppercase"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="rounded-full" disabled={isPending} onClick={enregistrer}>
          {isPending && <Loader2 className="size-3.5 animate-spin" />}
          Enregistrer
        </Button>
        {ibanInitial && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={isPending}
            onClick={() => {
              setModification(false);
              setIban(ibanInitial ? formaterIban(ibanInitial) : "");
              setBic(bicInitial ?? "");
              setErreur(null);
            }}
          >
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}
