"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "/#metiers", label: "Les métiers" },
  { href: "/#fonctionnement", label: "Comment ça marche" },
  { href: "/#professionnels", label: "Vous êtes professionnel" },
];

/**
 * Le header masque la nav et "Me connecter" en dessous de 900px/640px
 * sans aucun remplacement — un visiteur mobile n'avait alors aucun
 * moyen de se connecter ni de parcourir les rubriques (trouvé lors de
 * l'audit responsive Bloc 10). Ce menu ne s'affiche que sur ces mêmes
 * largeurs (voir la classe sur le bouton déclencheur dans header.tsx).
 */
export function MobileNav({ estConnecte }: { estConnecte: boolean }) {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="Ouvrir le menu" />}
      >
        <Menu className="size-5" />
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {NAV_LINKS.map((link) => (
            <SheetClose
              key={link.href}
              nativeButton={false}
              render={
                <Link
                  href={link.href}
                  className="rounded-md px-2 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                />
              }
            >
              {link.label}
            </SheetClose>
          ))}
          {!estConnecte && (
            <SheetClose
              nativeButton={false}
              render={
                <Link
                  href="/connexion"
                  className="rounded-md px-2 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                />
              }
            >
              Me connecter
            </SheetClose>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
