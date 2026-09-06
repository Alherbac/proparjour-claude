"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type LienNav = { href: string; label: string; compteur?: number };

/**
 * Barre latérale — dossier design §3. 244px, flex:none, fond #1A1917.
 * Entrée : poids 600, 12,5px, pastille 5px à gauche (#E21D1B actif,
 * #4A443C inactif). Compteur à droite si non nul, jamais saisi à la
 * main : il vient du même calcul que la carte d'indicateur (§6.a).
 * En bas : bloc compte, initiales sur rond #E21D1B.
 *
 * Pas de bascule Client/Prestataire ici : le prompt la réserve
 * explicitement à la maquette statique — "en production chaque
 * utilisateur voit son espace" (§3). Ce composant n'affiche donc que
 * l'espace réel de l'utilisateur connecté.
 */
function GroupeLiens({ liens, pathname }: { liens: LienNav[]; pathname: string }) {
  return (
    <>
      {liens.map((lien) => {
        const actif = lien.href === "/client" || lien.href === "/prestataire" ? pathname === lien.href : pathname.startsWith(lien.href);
        return (
          <Link
            key={lien.href}
            href={lien.href}
            className={`flex items-center gap-2.5 rounded-[9px] px-[10px] py-[10px] text-[12.5px] font-semibold transition-colors ${
              actif ? "bg-[#2E2A26] text-white" : "text-[#B8B2AA] hover:bg-[#2E2A26]/60"
            }`}
          >
            <span
              className="size-[5px] shrink-0 rounded-full"
              style={{ backgroundColor: actif ? "#E21D1B" : "#4A443C" }}
            />
            <span className="min-w-0 flex-1 truncate">{lien.label}</span>
            {typeof lien.compteur === "number" && lien.compteur > 0 && (
              <span
                className="shrink-0 rounded-[999px] px-[7px] py-[1px] text-[10.5px] font-bold"
                style={{ backgroundColor: "rgba(226,29,27,.2)", border: "1px solid rgba(226,29,27,.38)", color: "#F4A19F" }}
              >
                {lien.compteur}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar({
  espace,
  liens,
  autres,
  nom,
  sousTitre,
}: {
  espace: "Espace client" | "Espace prestataire";
  liens: LienNav[];
  autres?: LienNav[];
  nom: string;
  sousTitre: string;
}) {
  const pathname = usePathname();
  const initiales = nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("") || "?";

  return (
    <aside className="flex w-[244px] shrink-0 flex-col bg-[#1A1917]">
      <div className="px-5 pb-5 pt-6">
        <Link href="/prestataire" className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-[#E21D1B] text-[13px] font-bold text-white">P</span>
          <span className="text-[15px] font-bold text-white">ProParJour</span>
        </Link>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#B8B2AA]">{espace}</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        <GroupeLiens liens={liens} pathname={pathname} />
        {autres && autres.length > 0 && (
          <>
            <p className="px-[10px] pb-1 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#6B655C]">Autres</p>
            <GroupeLiens liens={autres} pathname={pathname} />
          </>
        )}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-[#2E2A26] px-5 py-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E21D1B] text-[12px] font-bold text-white">
          {initiales}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-semibold text-white">{nom}</p>
          <p className="truncate text-[11px] text-[#B8B2AA]">{sousTitre}</p>
        </div>
      </div>
    </aside>
  );
}
