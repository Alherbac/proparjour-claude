"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFavoris } from "@/hooks/use-favoris";
import { createClient } from "@/lib/supabase/client";
import { METIERS } from "@/config/metiers";
import { FavoriButton } from "@/components/prestataire/favori-button";
import { cn } from "@/lib/utils";
import type { PrestatairesPublicsRow } from "@/lib/supabase/database.types";

export function FavorisSection() {
  const favoris = useFavoris();
  const [profils, setProfils] = useState<PrestatairesPublicsRow[]>([]);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    if (favoris.ids.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resynchronise l'affichage suite à un changement des favoris (store externe, localStorage), pas une boucle de rendus
      setProfils([]);
      setCharge(true);
      return;
    }
    const supabase = createClient();
    supabase
      .from("prestataires_publics")
      .select("*")
      .in("id", favoris.ids)
      .then(({ data }) => {
        setProfils(data ?? []);
        setCharge(true);
      });
  }, [favoris.ids]);

  if (!charge) return null;

  if (profils.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
        Aucun favori pour l&apos;instant. Ajoutez-en depuis un profil ou une recommandation.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {profils.map((profil) => {
        const metier = METIERS.find((m) => m.id === profil.metier);
        return (
          <div key={profil.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-4">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-foreground/70",
                metier?.accent.gradient,
              )}
            >
              {(profil.prenom ?? "P").charAt(0)}
            </div>
            <Link href={`/prestataires/${profil.id}`} className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{profil.prenom}</p>
              <p className="truncate text-sm text-muted-foreground">{metier?.label}</p>
            </Link>
            <FavoriButton prestataireId={profil.id} className="static bg-transparent shadow-none" />
          </div>
        );
      })}
    </div>
  );
}
