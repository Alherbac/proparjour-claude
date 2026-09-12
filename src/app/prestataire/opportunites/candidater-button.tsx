"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DashButton } from "@/app/prestataire/_components/button";
import { Badge } from "@/app/prestataire/_components/badge";
import { postulerOffre } from "@/app/actions/offres";
import type { CandidatureStatutType } from "@/lib/supabase/database.types";

const STATUT_LABEL: Record<CandidatureStatutType, { label: string; tone: "vert" | "orange" | "rouge" | "bleu" | "gris" }> = {
  en_attente: { label: "Candidature envoyée — en attente de réponse", tone: "orange" },
  en_discussion: { label: "Retenue — en discussion avec le client", tone: "bleu" },
  acceptee: { label: "Candidature acceptée", tone: "vert" },
  refusee: { label: "Candidature refusée", tone: "gris" },
};

/** Même action réelle que l'ancien CandidaterButton (postulerOffre) — seule l'interface change. */
export function CandidaterButton({
  offreId,
  statutInitial,
  postulable,
  raisonBlocage,
}: {
  offreId: string;
  statutInitial: CandidatureStatutType | undefined;
  postulable: boolean;
  /** Message affiché à la place du bouton (ex. profil non vérifié) — audit prod I4. */
  raisonBlocage?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [statut, setStatut] = useState(statutInitial);

  function candidater() {
    startTransition(async () => {
      const result = await postulerOffre(offreId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setStatut("en_attente");
      toast.success("Votre candidature a été envoyée.");
    });
  }

  if (statut) {
    const info = STATUT_LABEL[statut];
    return <Badge tone={info.tone}>{info.label}</Badge>;
  }

  if (raisonBlocage) {
    return <p className="text-[13px] text-[#6B6660]">{raisonBlocage}</p>;
  }

  if (!postulable) {
    return <p className="text-[13px] text-[#6B6660]">Cette offre n&apos;est plus disponible.</p>;
  }

  return (
    <DashButton variant="plein" disabled={isPending} onClick={candidater}>
      {isPending ? "Envoi..." : "Candidater"}
    </DashButton>
  );
}
