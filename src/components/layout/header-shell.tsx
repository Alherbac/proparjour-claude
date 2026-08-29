import type { ReactNode } from "react";

/**
 * Header sticky, fond et bordure fixes (refonte Claude Istanbul 1,
 * §4.1) — rgba(251,250,248,.88) + flou 14px et filet #EAE6E0
 * toujours visibles, plus de bascule au scroll comme avant.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  return (
    <header className="theme-pin-light sticky top-0 z-[60] border-b border-ppj-line bg-[rgba(251,250,248,0.88)] backdrop-blur-[14px]">
      {children}
    </header>
  );
}
