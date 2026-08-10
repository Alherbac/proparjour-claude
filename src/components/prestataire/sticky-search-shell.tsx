"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Rétracte la barre de recherche en version compacte, collée sous le
 * header au scroll (comportement façon Airbnb) — les chips métier et
 * le lien "Publier une offre" s'effacent, seul le formulaire de
 * recherche reste, resserré.
 */
export function StickySearchShell({
  chips,
  children,
}: {
  chips: React.ReactNode;
  children: React.ReactNode;
}) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    function onScroll() {
      setCompact(window.scrollY > 140);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "sticky top-[76px] z-30 -mx-4 px-4 transition-all duration-300 ease-out lg:-mx-8 lg:px-8",
        compact && "border-b border-border bg-background/95 shadow-sm backdrop-blur-sm",
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-[1600px] transition-all duration-300 ease-out",
          compact ? "py-2.5" : "py-0",
        )}
      >
        <div
          className={cn(
            "grid overflow-hidden transition-all duration-300 ease-out",
            compact ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
          )}
        >
          <div className="min-h-0">{chips}</div>
        </div>
        {children}
      </div>
    </div>
  );
}
