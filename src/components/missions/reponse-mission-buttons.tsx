"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { repondreMissionLigne } from "@/app/actions/missions";

export function ReponseMissionButtons({ ligneId }: { ligneId: string }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState<"acceptee" | "refusee" | null>(null);

  async function repondre(reponse: "acceptee" | "refusee") {
    setEnvoi(reponse);
    const result = await repondreMissionLigne(ligneId, reponse);
    setEnvoi(null);
    if (result.success) router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        className="rounded-full"
        disabled={envoi !== null}
        onClick={() => repondre("refusee")}
      >
        <X className="size-3.5" />
        Refuser
      </Button>
      <Button
        size="sm"
        className="rounded-full"
        disabled={envoi !== null}
        onClick={() => repondre("acceptee")}
      >
        <Check className="size-3.5" />
        Accepter
      </Button>
    </div>
  );
}
