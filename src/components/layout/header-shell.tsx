"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Header transparent+flou au repos, qui devient flou plus opaque +
 * ombre + bordure passé 8px de scroll — logique JS reprise telle
 * quelle de proparjour-landing-v2.html (#site-header / .scrolled).
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "theme-pin-light sticky top-0 z-[60] border-b border-transparent bg-paper/72 backdrop-blur-[14px] backdrop-saturate-[1.4] transition-[border-color,box-shadow,background-color] duration-[250ms] ease-[cubic-bezier(0.16,0.84,0.44,1)]",
        scrolled && "border-line bg-paper/92 shadow-[0_4px_24px_-12px_rgba(10,15,28,0.12)]",
      )}
    >
      {children}
    </header>
  );
}
