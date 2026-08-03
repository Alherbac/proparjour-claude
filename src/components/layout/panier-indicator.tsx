"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePanier } from "@/hooks/use-panier";

export function PanierIndicator() {
  const panier = usePanier();
  const count = panier.lignes.length;

  return (
    <Button
      render={<Link href="/panier" />}
      variant="ghost"
      size="icon"
      aria-label="Panier"
      className="relative rounded-full text-muted-foreground"
    >
      <ShoppingCart className="size-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {count}
        </span>
      )}
    </Button>
  );
}
