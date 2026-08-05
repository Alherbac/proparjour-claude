"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Verification2FAForm({ factorId }: { factorId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function valider() {
    setEnvoi(true);
    setErreur(null);
    const supabase = createClient();
    const { data: challenge, error: erreurChallenge } = await supabase.auth.mfa.challenge({ factorId });
    if (erreurChallenge || !challenge) {
      setEnvoi(false);
      setErreur(erreurChallenge?.message ?? "Échec de la vérification.");
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    setEnvoi(false);
    if (error) {
      setErreur("Code incorrect — réessaie.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="123456"
        maxLength={6}
        autoFocus
      />
      <Button
        onClick={valider}
        disabled={envoi || code.trim().length !== 6}
        className="w-full rounded-full"
      >
        {envoi && <Loader2 className="size-4 animate-spin" />}
        Valider
      </Button>
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
    </div>
  );
}
