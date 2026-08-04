"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Wallet, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const LIENS_PRESTATAIRE = [
  { href: "/tableau-de-bord/accueil", label: "Accueil", icon: Home },
  { href: "/tableau-de-bord/missions", label: "Missions", icon: ClipboardList },
  { href: "/tableau-de-bord/argent", label: "Mon argent", icon: Wallet },
  { href: "/tableau-de-bord/compte", label: "Mon compte", icon: UserRound },
] as const;

const LIENS_RECRUTEUR = [
  { href: "/tableau-de-bord/accueil", label: "Accueil", icon: Home },
  { href: "/tableau-de-bord/missions", label: "Missions", icon: ClipboardList },
  { href: "/tableau-de-bord/compte", label: "Mon compte", icon: UserRound },
] as const;

export function BottomNav({ role }: { role: "prestataire" | "recruteur" }) {
  const pathname = usePathname();
  const LIENS = role === "recruteur" ? LIENS_RECRUTEUR : LIENS_PRESTATAIRE;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-3xl items-stretch">
        {LIENS.map((lien) => {
          const actif = pathname.startsWith(lien.href);
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
