"use client";

import Link from "next/link";
import { ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { METIERS } from "@/config/metiers";
import { usePanier } from "@/hooks/use-panier";
import { montantLigne, retirerLigne, totalPanier } from "@/lib/panier";

export function PanierIndicator() {
  const panier = usePanier();
  const count = panier.lignes.length;
  const total = totalPanier(panier);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Panier"
            className="relative rounded-full text-muted-foreground"
          />
        }
      >
        <ShoppingCart className="size-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {count}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        {count === 0 ? (
          <div className="py-2 text-center">
            <p className="text-sm text-muted-foreground">Votre panier est vide.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm font-medium text-foreground">
              {count} prestataire{count > 1 ? "s" : ""} sur cette mission
            </p>
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {panier.lignes.map((ligne, index) => {
                const metier = METIERS.find((m) => m.id === ligne.metier);
                return (
                  <li
                    key={`${ligne.prestataireId}-${index}`}
                    className="flex items-center gap-2.5 rounded-lg border border-border p-2"
                  >
                    <Link
                      href={`/prestataires/${ligne.prestataireId}`}
                      className="shrink-0"
                    >
                      {ligne.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- pas d'autre usage de next/image dans ce projet
                        <img
                          src={ligne.photoUrl}
                          alt={ligne.prenom}
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground/70">
                          {ligne.prenom.charAt(0)}
                        </div>
                      )}
                    </Link>
                    <Link
                      href={`/prestataires/${ligne.prestataireId}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="truncate text-sm font-medium text-foreground">
                        {ligne.prenom}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {metier?.label} · {ligne.heureDebut}–{ligne.heureFin}
                      </p>
                    </Link>
                    <span className="shrink-0 text-xs font-medium text-foreground">
                      {montantLigne(ligne)} €
                    </span>
                    <button
                      type="button"
                      aria-label="Retirer du panier"
                      onClick={() => retirerLigne(index)}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-medium text-foreground">Total</span>
              <span className="font-heading text-lg font-semibold text-foreground">
                {total} €
              </span>
            </div>
            <Button render={<Link href="/panier" />} className="mt-3 w-full rounded-full">
              Valider le panier
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
