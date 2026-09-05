"use client";

import { forwardRef } from "react";

/**
 * Boutons — dossier design §2/§4. Trois variantes :
 *  - plein   : fond #E21D1B, survol #B8130F — CTA principal.
 *  - sombre  : fond #1A1917, survol #E21D1B — action sur une ligne
 *              "À faire maintenant".
 *  - secondaire : fond blanc, bordure #DDD8D1.
 * Radius 10-11px, min-height 44px pour toute cible tactile (§9).
 */
type Variant = "plein" | "sombre" | "secondaire";

const VARIANTS: Record<Variant, string> = {
  plein: "bg-[#E21D1B] text-white hover:bg-[#B8130F] border border-[#E21D1B]",
  sombre: "bg-[#1A1917] text-[#FBFAF8] hover:bg-[#E21D1B] border border-[#1A1917]",
  secondaire: "bg-white text-[#1A1917] border border-[#DDD8D1] hover:border-[#1A1917]",
};

export const DashButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function DashButton({ variant = "secondaire", className = "", children, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-4 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
