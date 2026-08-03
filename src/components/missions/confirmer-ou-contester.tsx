"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmerServiceFait, contesterMission } from "@/app/actions/missions";

export function ConfirmerOuContester({ missionId }: { missionId: string }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState<"confirmer" | "contester" | null>(null);
  const [contestationOuverte, setContestationOuverte] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleConfirmer() {
    setEnvoi("confirmer");
    setErreur(null);
    const result = await confirmerServiceFait(missionId);
    setEnvoi(null);
    if (result.success) {
      router.refresh();
    } else {
      setErreur(result.error);
    }
  }

  async function handleContester() {
    setEnvoi("contester");
    setErreur(null);
    const result = await contesterMission(missionId, motif);
    setEnvoi(null);
    if (result.success) {
      router.refresh();
    } else {
      setErreur(result.error);
    }
  }

  if (contestationOuverte) {
    return (
      <div className="flex w-full flex-col items-end gap-2">
        <Input
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          placeholder="Motif de la contestation"
          className="w-full"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setContestationOuverte(false)}>
            Annuler
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full text-destructive hover:text-destructive"
            disabled={envoi !== null}
            onClick={handleContester}
          >
            {envoi === "contester" && <Loader2 className="size-3.5 animate-spin" />}
            Envoyer la contestation
          </Button>
        </div>
        {erreur && <p className="max-w-56 text-right text-xs text-destructive">{erreur}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="rounded-full text-destructive hover:text-destructive"
          disabled={envoi !== null}
          onClick={() => setContestationOuverte(true)}
        >
          <TriangleAlert className="size-3.5" />
          Contester
        </Button>
        <Button size="sm" className="rounded-full" disabled={envoi !== null} onClick={handleConfirmer}>
          {envoi === "confirmer" ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
          Confirmer le service fait
        </Button>
      </div>
      {erreur && <p className="max-w-56 text-right text-xs text-destructive">{erreur}</p>}
    </div>
  );
}
