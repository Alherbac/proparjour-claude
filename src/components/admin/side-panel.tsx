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
        "fixed inset-0 z-40 transition-opacity",
        ouvert ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onFermer} />
      <div
        className={cn(
          "absolute top-0 right-0 flex h-full w-[380px] max-w-full flex-col border-l border-border bg-background shadow-xl transition-transform duration-200 ease-out",
          ouvert ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-base font-semibold text-foreground">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
