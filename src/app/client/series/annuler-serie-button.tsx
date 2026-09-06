"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { DashButton } from "@/app/client/_components/button";
import { annulerSerie } from "@/app/actions/series";

/** Même action réelle que l'ancien AnnulerSerieButton (annulerSerie) — seule l'interface change. */
export function AnnulerSerieButton({ serieId }: { serieId: string }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleClick() {
    setEnvoi(true);
    setErreur(null);
    const result = await annulerSerie(serieId);
    setEnvoi(false);
    if (result.success) router.refresh();
    else setErreur(result.error);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DashButton variant="secondaire" disabled={envoi} onClick={handleClick}>
        <X className="size-3.5" />
        {envoi ? "Annulation..." : "Annuler la série"}
      </DashButton>
      {erreur && <p className="max-w-56 text-right text-[12px]" style={{ color: "#8E2A26" }}>{erreur}</p>}
    </div>
  );
}
