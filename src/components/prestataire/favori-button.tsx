"use client";

import { Heart } from "lucide-react";
import { useFavoris } from "@/hooks/use-favoris";
import { basculerFavori } from "@/lib/favoris";
import { cn } from "@/lib/utils";

export function FavoriButton({ prestataireId, className }: { prestataireId: string; className?: string }) {
  const favoris = useFavoris();
  const actif = favoris.ids.includes(prestataireId);

  return (
    <button
      type="button"
      aria-label={actif ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={actif}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        basculerFavori(prestataireId);
      }}
      className={cn(
        "flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:text-destructive",
        className,
      )}
    >
      <Heart className={cn("size-4", actif && "fill-destructive text-destructive")} />
    </button>
  );
}
