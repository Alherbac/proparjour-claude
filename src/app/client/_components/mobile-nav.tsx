"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LienNav } from "@/app/client/_components/sidebar";

/**
 * Barre inférieure — dossier design §9 : sous 1024px, la barre
 * latérale se replie en barre inférieure à 5 entrées ; les deux
 * dernières passent dans un "Plus".
 */
export function MobileNav({ liens }: { liens: LienNav[] }) {
  const pathname = usePathname();
  const [plusOuvert, setPlusOuvert] = useState(false);
  const [dernierPathname, setDernierPathname] = useState(pathname);
  if (pathname !== dernierPathname) {
    setDernierPathname(pathname);
    setPlusOuvert(false);
  }

  const primaires = liens.slice(0, 5);
  const reste = liens.slice(5);

  function estActif(href: string) {
    return href === liens[0].href ? pathname === href : pathname.startsWith(href);
  }

  return (
    <>
      {plusOuvert && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setPlusOuvert(false)} aria-hidden="true" />}
      {reste.length > 0 && (
        <div
          className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-[#EAE6E0] bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)] transition-transform duration-200 lg:hidden ${
            plusOuvert ? "translate-y-0" : "pointer-events-none translate-y-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#EFEBE6] px-4 py-3">
            <p className="text-[13px] font-semibold text-[#1A1917]">Plus</p>
            <button type="button" onClick={() => setPlusOuvert(false)} className="text-[#6B6660]">
              ✕
            </button>
          </div>
          <div className="py-2 pb-[calc(64px+env(safe-area-inset-bottom))]">
            {reste.map((lien) => (
              <Link key={lien.href} href={lien.href} className={`flex items-center justify-between px-4 py-3 text-[14px] font-medium ${estActif(lien.href) ? "text-[#E21D1B]" : "text-[#1A1917]"}`}>
                {lien.label}
                {typeof lien.compteur === "number" && lien.compteur > 0 && <span className="rounded-full bg-[#F6F4F0] px-2 py-0.5 text-[11px] font-bold text-[#6B6660]">{lien.compteur}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#EAE6E0] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="flex items-stretch">
          {primaires.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className={`relative flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2.5 text-center text-[12px] font-medium ${estActif(lien.href) ? "text-[#E21D1B]" : "text-[#6B6660]"}`}
            >
              <span className="w-full truncate">{lien.label}</span>
              {typeof lien.compteur === "number" && lien.compteur > 0 && <span className="absolute right-2 top-1 size-[6px] rounded-full bg-[#E21D1B]" />}
            </Link>
          ))}
          {reste.length > 0 && (
            <button
              type="button"
              onClick={() => setPlusOuvert((v) => !v)}
              className={`flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2.5 text-[12px] font-medium ${plusOuvert ? "text-[#E21D1B]" : "text-[#6B6660]"}`}
            >
              Plus
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
