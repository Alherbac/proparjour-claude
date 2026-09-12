"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Frontière d'erreur du back-office (audit prod — robustesse). Rend à
 * l'intérieur du layout /admin (thème admin-theme.css appliqué sur ce
 * sous-arbre). Aucun changement de comportement métier.
 */
export default function AdminError({
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
      <div
        className="w-full max-w-[440px] rounded-[16px] border p-7 text-center"
        style={{ background: "var(--a-surface)", borderColor: "var(--a-border)" }}
      >
        <span
          className="inline-grid size-11 place-items-center rounded-[12px] border text-[19px] font-bold"
          style={{ background: "var(--a-surface-2)", borderColor: "var(--a-border)", color: "var(--a-accent)" }}
        >
          !
        </span>
        <h1 className="mt-4 text-[20px] font-bold" style={{ color: "var(--a-ink)", fontFamily: "var(--font-admin-syne)" }}>
          Une erreur est survenue
        </h1>
        <p className="mx-auto mt-2 max-w-[36em] text-[13px] leading-[1.6]" style={{ color: "var(--a-text-2)" }}>
          Un incident technique a interrompu l&apos;affichage de cette page du back-office.
          Réessayez&nbsp;; si le problème persiste, revenez au tableau de bord.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-11 rounded-[10px] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--a-accent)" }}
          >
            Réessayer
          </button>
          <Link
            href="/admin"
            className="min-h-11 rounded-[10px] border px-4 text-[13px] font-semibold leading-[44px] transition-colors"
            style={{ borderColor: "var(--a-border-strong)", color: "var(--a-ink)" }}
          >
            Retour au tableau de bord
          </Link>
        </div>
        {error.digest && (
          <p className="mt-5 font-mono text-[11px]" style={{ color: "var(--a-text-3)" }}>
            Référence : {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
