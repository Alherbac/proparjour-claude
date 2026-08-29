"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { postulerOffre } from "@/app/actions/offres";
import type { CandidatureStatutType } from "@/lib/supabase/database.types";

const STATUT_LABEL: Record<CandidatureStatutType, string> = {
  en_attente: "Candidature envoyée — en attente de réponse",
  acceptee: "Candidature acceptée",
  refusee: "Candidature refusée",
};

export function CandidaterButton({
  offreId,
  statutInitial,
  postulable,
}: {
  offreId: string;
  statutInitial: CandidatureStatutType | undefined;
  postulable: boolean;
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
    return (
      <Badge variant="secondary" className="w-fit font-normal">
        {STATUT_LABEL[statut]}
      </Badge>
    );
  }

  if (!postulable) {
    return <p className="text-sm text-muted-foreground">Cette offre n&apos;est plus disponible.</p>;
  }

  return (
    <Button type="button" size="lg" className="rounded-full" disabled={isPending} onClick={candidater}>
      <Send className="size-4" />
      {isPending ? "Envoi..." : "Candidater"}
    </Button>
  );
}
