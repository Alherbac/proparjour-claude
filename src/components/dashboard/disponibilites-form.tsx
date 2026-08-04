"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ChipMultiSelect } from "@/components/onboarding/chip-multi-select";
import { JOURS_SEMAINE } from "@/components/onboarding/prestataire/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mettreAJourDisponibilites } from "@/app/actions/compte";

export function DisponibilitesForm({
  disponibilitesInitiales,
  visibleInitial,
}: {
  disponibilitesInitiales: string[];
  visibleInitial: boolean;
}) {
  const [jours, setJours] = useState(disponibilitesInitiales);
  const [visible, setVisible] = useState(visibleInitial);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleEnregistrer() {
    setEnvoi(true);
    setMessage(null);
    const result = await mettreAJourDisponibilites(jours, visible);
    setEnvoi(false);
    setMessage(result.success ? "Enregistré." : result.error);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Visible aux recruteurs</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-pressed={visible}
            onClick={() => setVisible(true)}
            className={cn(
              "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
              visible ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground",
            )}
          >
            🟢 Ouvert aux missions
          </button>
          <button
            type="button"
            aria-pressed={!visible}
            onClick={() => setVisible(false)}
            className={cn(
              "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
              !visible ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground",
            )}
          >
            🔴 Fermé pour le moment
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Jours disponibles</p>
        <ChipMultiSelect options={JOURS_SEMAINE} value={jours} onChange={setJours} />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleEnregistrer} disabled={envoi} className="rounded-full">
          {envoi && <Loader2 className="size-3.5 animate-spin" />}
          Enregistrer
        </Button>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}
