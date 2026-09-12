"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

/**
 * Frontière d'erreur racine (audit prod — robustesse). Rend dans le
 * seul layout racine (pas de Header/Footer marketing) : on reconstitue
 * un en-tête minimal, même pattern que not-found.tsx. Ne change aucun
 * comportement métier — capture uniquement les erreurs de rendu non
 * gérées pour éviter l'écran blanc.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-full bg-secondary/30">
      <header className="border-b border-border bg-background px-4 py-4 lg:px-8">
        <Logo />
      </header>
      <div className="mx-auto max-w-md px-4 py-16 text-center lg:px-8">
        <span
          className="inline-grid size-12 place-items-center rounded-[14px] border border-ppj-line bg-ppj-field text-[22px] text-primary"
          style={{ fontFamily: "var(--font-display-serif)" }}
        >
          !
        </span>
        <p
          className="mx-auto mt-4 mb-2 text-ppj-ink"
          style={{ fontFamily: "var(--font-display-serif)", fontSize: "26px", letterSpacing: "-0.01em" }}
        >
          Une erreur est survenue
        </p>
        <p className="mx-auto mb-6 max-w-[34em] text-[14.5px] leading-[1.6] text-ppj-text-3">
          Un incident technique a interrompu l&apos;affichage de cette page. Vous pouvez réessayer&nbsp;;
          si le problème persiste, revenez à l&apos;accueil.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Button
            onClick={() => reset()}
            className="min-h-12 rounded-[13px] bg-primary px-[22px] text-[15px] font-semibold text-white hover:bg-[#B8130F]"
          >
            Réessayer
          </Button>
          <Button
            variant="outline"
            render={<Link href="/" />}
            className="min-h-12 rounded-[13px] px-[22px] text-[15px] font-semibold"
          >
            Retour à l&apos;accueil
          </Button>
        </div>
        {error.digest && (
          <p className="mt-6 font-mono text-[11px] text-ppj-text-4">Référence : {error.digest}</p>
        )}
      </div>
    </div>
  );
}
