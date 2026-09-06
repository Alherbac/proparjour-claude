"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DashButton } from "@/app/client/_components/button";
import { retenirCandidature } from "@/app/client/actions";

/**
 * "Écrire au candidat" directement depuis sa fiche privée — même
 * action réelle que l'icône ✉ de la liste "Candidatures reçues"
 * (retenirCandidature, app/client/actions.ts) : ouvre la conversation.
 * Ajouté ici pour éviter l'aller-retour "profil → liste → écrire" —
 * la fiche vient d'être marquée consultée (marquerProfilConsulte,
 * appelée par la page juste avant), donc le préalable est déjà
 * rempli au moment où ce bouton s'affiche.
 */
export function EcrireButton({ candidatureId }: { candidatureId: string }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);

  async function handleClick() {
    setEnvoi(true);
    const result = await retenirCandidature(candidatureId);
    setEnvoi(false);
    if (result.success && result.missionId) {
      router.push(`/missions/${result.missionId}`);
    } else if (!result.success) {
      toast.error(result.error);
    }
  }

  return (
    <DashButton variant="sombre" disabled={envoi} onClick={handleClick}>
      {envoi ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
      Écrire au candidat
    </DashButton>
  );
}
