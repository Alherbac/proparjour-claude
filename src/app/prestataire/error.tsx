"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Frontière d'erreur de l'espace prestataire (audit prod — robustesse).
 * Rend à l'intérieur du layout /prestataire. Aucun changement de
 * comportement métier.
 */
export default function PrestataireError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-[420px] rounded-[18px] border border-[#EAE6E0] bg-white p-7 text-center">
        <span
          className="inline-grid size-11 place-items-center rounded-[12px] border border-[#EAE6E0] bg-[#F6F4F0] text-[20px] text-[#E21D1B]"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          !
        </span>
        <h1
          className="mt-4 text-[22px] text-[#1A1917]"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          Une erreur est survenue
        </h1>
        <p className="mx-auto mt-2 max-w-[34em] text-[13.5px] leading-[1.6] text-[#6B6660]">
          Un incident technique a interrompu l&apos;affichage. Réessayez&nbsp;; si le
          problème persiste, revenez à votre activité.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-11 rounded-[10px] bg-[#B8130F] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#E21D1B]"
          >
            Réessayer
          </button>
          <Link
            href="/prestataire"
            className="min-h-11 rounded-[10px] border border-[#DDD8D1] px-4 text-[13px] font-semibold leading-[44px] text-[#1A1917] transition-colors hover:bg-[#F6F4F0]"
          >
            Retour à votre activité
          </Link>
        </div>
        {error.digest && (
          <p className="mt-5 font-mono text-[11px] text-[#98938B]">Référence : {error.digest}</p>
        )}
      </div>
    </div>
  );
}
