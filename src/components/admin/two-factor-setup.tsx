"use client";

import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Etape = "inactif" | "qr_affiche" | "verification_en_cours";

export function TwoFactorSetup({ dejaActivee }: { dejaActivee: boolean }) {
  const [etape, setEtape] = useState<Etape>("inactif");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [activee, setActivee] = useState(dejaActivee);
  const [envoi, setEnvoi] = useState(false);

  async function demarrerEnrolement() {
    setErreur(null);
    setEnvoi(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `authenticator-${Date.now()}`,
    });
    setEnvoi(false);
    if (error || !data) {
      setErreur(error?.message ?? "Impossible de démarrer la configuration.");
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEtape("qr_affiche");
  }

  async function confirmerCode() {
    if (!factorId) return;
    setErreur(null);
    setEnvoi(true);
    const supabase = createClient();
    const { data: challenge, error: erreurChallenge } = await supabase.auth.mfa.challenge({ factorId });
    if (erreurChallenge || !challenge) {
      setEnvoi(false);
      setErreur(erreurChallenge?.message ?? "Échec de la vérification.");
      return;
    }
    const { error: erreurVerif } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    setEnvoi(false);
    if (erreurVerif) {
      setErreur("Code incorrect — réessaie.");
      return;
    }
    setActivee(true);
    setEtape("inactif");
  }

  if (activee) {
    return (
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="text-sm font-medium text-foreground">Double authentification activée</p>
          <p className="text-sm text-muted-foreground">
            Un code de ton application d&apos;authentification est demandé à chaque connexion.
          </p>
        </div>
      </div>
    );
  }

  if (etape === "inactif") {
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          Obligatoire pour tout compte admin ou modérateur — configure-la maintenant pour accéder au
          reste du back-office.
        </p>
        <Button className="mt-3 rounded-full" onClick={demarrerEnrolement} disabled={envoi}>
          {envoi && <Loader2 className="size-4 animate-spin" />}
          Configurer la double authentification
        </Button>
        {erreur && <p className="mt-2 text-sm text-destructive">{erreur}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground">
        Scanne ce code avec ton application d&apos;authentification (Google Authenticator, 1Password,
        etc.), puis saisis le code à 6 chiffres.
      </p>
      {qrCode && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrCode} alt="QR code de configuration 2FA" className="size-48 rounded-lg border border-border" />
      )}
      {secret && (
        <p className="text-xs text-muted-foreground">
          Impossible de scanner ? Saisis ce code manuellement :{" "}
          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono">{secret}</code>
        </p>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          maxLength={6}
          className="w-32"
        />
        <Button onClick={confirmerCode} disabled={envoi || code.trim().length !== 6} className="rounded-full">
          {envoi && <Loader2 className="size-4 animate-spin" />}
          Valider
        </Button>
      </div>
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
    </div>
  );
}
