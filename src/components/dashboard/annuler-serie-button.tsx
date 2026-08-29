"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { annulerSerie } from "@/app/actions/series";

/** N'annule que la série (plus de nouvelle occurrence) — les missions déjà créées suivent leurs propres règles d'annulation. */
export function AnnulerSerieButton({ serieId }: { serieId: string }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleClick() {
    setEnvoi(true);
    setErreur(null);
    const result = await annulerSerie(serieId);
    setEnvoi(false);
    if (result.success) {
      router.refresh();
    } else {
      setErreur(result.error);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" className="rounded-full" disabled={envoi} onClick={handleClick}>
        {envoi ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
        Annuler la série
      </Button>
      {erreur && <p className="max-w-56 text-right text-xs text-destructive">{erreur}</p>}
    </div>
  );
}
