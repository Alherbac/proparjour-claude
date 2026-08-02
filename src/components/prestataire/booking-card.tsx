"use client";

import { toast } from "sonner";
import { ShoppingCart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FreelanceDemo } from "@/data/freelances-demo";

export function BookingCard({ freelance }: { freelance: FreelanceDemo }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
      <div className="flex items-baseline gap-1">
        <span className="font-heading text-3xl font-semibold text-foreground">
          {freelance.tarifMontant} €
        </span>
        <span className="text-sm text-muted-foreground">
          / {freelance.tarifType === "horaire" ? "heure" : "jour"}
        </span>
      </div>

      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="size-3.5" />
        Intervient à {freelance.ville} et alentours
      </p>

      <Button
        className="mt-5 w-full rounded-full"
        onClick={() =>
          toast(
            `Le panier multi-prestataires arrive bientôt. ${freelance.prenom} sera disponible à la réservation dès son activation.`,
          )
        }
      >
        <ShoppingCart className="size-4" />
        Ajouter au panier
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Aucun engagement — annulation gratuite jusqu&apos;à 48h avant la mission.
      </p>
    </div>
  );
}
