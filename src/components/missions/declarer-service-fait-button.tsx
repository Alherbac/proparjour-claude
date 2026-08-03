"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { declarerServiceFaitLigne } from "@/app/actions/missions";

export function DeclarerServiceFaitButton({ ligneId }: { ligneId: string }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleClick() {
    setEnvoi(true);
    setErreur(null);
    const result = await declarerServiceFaitLigne(ligneId);
    setEnvoi(false);
    if (result.success) {
      router.refresh();
    } else {
      setErreur(result.error);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" className="rounded-full" disabled={envoi} onClick={handleClick}>
        {envoi ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
        Déclarer le service fait
      </Button>
      {erreur && <p className="max-w-56 text-right text-xs text-destructive">{erreur}</p>}
    </div>
  );
}
