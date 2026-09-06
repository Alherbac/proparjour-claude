"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AdminButton } from "@/components/admin/ui/button";
import { cn } from "@/lib/utils";

const LONGUEUR_CODE = 6;

/**
 * Saisie du code à 6 chiffres — dossier design, "États système" §
 * isStates, carte "Back-office — double authentification" : 6 cases
 * individuelles plutôt qu'un seul champ texte. Reprend le motif sans
 * le fond sombre de la carte de référence (illustration isolée dans
 * un catalogue d'états) : le reste de /admin est un thème clair,
 * jamais mélangé ici.
 */
export function Verification2FAForm({ factorId }: { factorId: string }) {
  const router = useRouter();
  const [chiffres, setChiffres] = useState<string[]>(Array(LONGUEUR_CODE).fill(""));
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const code = chiffres.join("");
  const codeComplet = code.length === LONGUEUR_CODE;

  function setChiffre(index: number, valeur: string) {
    const chiffre = valeur.replace(/\D/g, "").slice(-1);
    setChiffres((prev) => {
      const suivant = [...prev];
      suivant[index] = chiffre;
      return suivant;
    });
    if (chiffre && index < LONGUEUR_CODE - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !chiffres[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (event.key === "Enter" && codeComplet) {
      valider();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const colle = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, LONGUEUR_CODE);
    if (!colle) return;
    event.preventDefault();
    setChiffres((prev) => {
      const suivant = [...prev];
      for (let i = 0; i < LONGUEUR_CODE; i += 1) suivant[i] = colle[i] ?? "";
      return suivant;
    });
    refs.current[Math.min(colle.length, LONGUEUR_CODE - 1)]?.focus();
  }

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
      code,
    });
    setEnvoi(false);
    if (error) {
      setErreur("Code incorrect — réessaie.");
      setChiffres(Array(LONGUEUR_CODE).fill(""));
      refs.current[0]?.focus();
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {chiffres.map((chiffre, index) => (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            autoFocus={index === 0}
            value={chiffre}
            onChange={(event) => setChiffre(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            aria-label={`Chiffre ${index + 1} du code`}
            className={cn(
              "h-[52px] w-[42px] rounded-[11px] border bg-[var(--a-surface)] text-center text-lg font-semibold text-[var(--a-ink)] outline-none transition-colors",
              "border-[var(--a-border-strong)] focus:border-[var(--a-accent)]",
              erreur && "border-[var(--a-badge-red-border)]",
            )}
          />
        ))}
      </div>
      {erreur && (
        <p className="text-center text-[13px] font-semibold" style={{ color: "var(--a-badge-red-text)" }}>
          {erreur}
        </p>
      )}
      <AdminButton variant="primary" onClick={valider} disabled={envoi || !codeComplet} className="w-full">
        {envoi && <Loader2 className="size-4 animate-spin" />}
        Vérifier
      </AdminButton>
    </div>
  );
}
