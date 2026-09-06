"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Panneau latéral de détail (380px, cahier des charges §2) — s'ouvre
 * au clic sur une ligne sans quitter la liste en cours. Composant
 * générique réutilisé par tous les modules admin qui en ont besoin
 * (Missions en premier, puis Utilisateurs, Validation...).
 */
export function SidePanel({
  titre,
  ouvert,
  onFermer,
  children,
}: {
  titre: string;
  ouvert: boolean;
  onFermer: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!ouvert) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onFermer();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ouvert, onFermer]);

  return (
    <div
      aria-hidden={!ouvert}
      className={cn(
        "ppj-admin fixed inset-0 z-40 transition-opacity",
        ouvert ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onFermer} />
      <div
        className={cn(
          "absolute top-0 right-0 flex h-full w-[380px] max-w-full flex-col border-l border-[var(--a-border)] bg-[var(--a-surface)] transition-transform duration-200 ease-out",
          ouvert ? "translate-x-0" : "translate-x-full",
        )}
        style={{ fontFamily: "var(--a-font-body)" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--a-border)] px-5 py-4">
          <h2 className="text-[15px] font-bold text-[var(--a-ink)]" style={{ fontFamily: "var(--a-font-display)" }}>
            {titre}
          </h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="flex size-8 items-center justify-center rounded-full text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-ink)]"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="a-scroll min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
