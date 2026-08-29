"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Wallet, UserRound, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const LIENS_PRESTATAIRE = [
  { href: "/tableau-de-bord/accueil", label: "Accueil", icon: Home, exact: true },
  { href: "/tableau-de-bord/missions", label: "Missions", icon: ClipboardList },
  { href: "/tableau-de-bord/messagerie", label: "Messages", icon: MessageCircle },
  { href: "/tableau-de-bord/argent", label: "Mon argent", icon: Wallet },
  { href: "/tableau-de-bord/compte", label: "Mon compte", icon: UserRound },
] as const;

const LIENS_RECRUTEUR = [
  { href: "/", label: "Accueil", icon: Home, exact: true },
  { href: "/tableau-de-bord/missions", label: "Missions", icon: ClipboardList },
  { href: "/tableau-de-bord/messagerie", label: "Messages", icon: MessageCircle },
  { href: "/tableau-de-bord/compte", label: "Mon compte", icon: UserRound },
] as const;

export function BottomNav({ role }: { role: "prestataire" | "recruteur" }) {
  const pathname = usePathname();
  const LIENS = role === "recruteur" ? LIENS_RECRUTEUR : LIENS_PRESTATAIRE;
  const navRef = useRef<HTMLElement>(null);

  // Audit final — CookieConsentBanner est aussi "fixed inset-x-0
  // bottom-0", pleine largeur : sans coordination, il se superposait
  // exactement à cette navigation tant que le visiteur n'avait pas
  // répondu (trouvé en testant réellement un premier passage sur le
  // site) — soit la navigation était masquée dessous, soit un simple
  // z-index supérieur ici aurait à son tour caché les boutons du
  // bandeau de cookies. Cette variable CSS publie la hauteur réelle de
  // la nav ; CookieConsentBanner s'en sert pour se poser juste
  // au-dessus plutôt que de se superposer — les deux restent entièrement
  // visibles et cliquables en même temps. Remise à 0 au démontage
  // (navigation vers une page sans cette barre).
  useEffect(() => {
    const definir = () => {
      document.documentElement.style.setProperty("--ppj-bottom-nav-h", `${navRef.current?.offsetHeight ?? 0}px`);
    };
    definir();
    window.addEventListener("resize", definir);
    return () => {
      window.removeEventListener("resize", definir);
      document.documentElement.style.setProperty("--ppj-bottom-nav-h", "0px");
    };
  }, []);

  return (
    <nav ref={navRef} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-3xl items-stretch">
        {LIENS.map((lien) => {
          const actif = "exact" in lien && lien.exact ? pathname === lien.href : pathname.startsWith(lien.href);
          const Icon = lien.icon;
          return (
            <Link
              key={lien.href}
              href={lien.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                actif ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-6" strokeWidth={actif ? 2.5 : 2} />
              {lien.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
