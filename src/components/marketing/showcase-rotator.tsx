"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { METIERS } from "@/config/metiers";
import { FREELANCES_DEMO } from "@/data/freelances-demo";
import { cn } from "@/lib/utils";

const ROTATION_MS = 3200;

/**
 * Fait défiler plusieurs prestataires dans la carte de mise en
 * situation du hero, en l'absence de vraies photos uploadées pour
 * l'instant (stockage à venir).
 */
export function ShowcaseRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % FREELANCES_DEMO.length);
    }, ROTATION_MS);
    return () => clearInterval(id);
  }, []);

  const freelance = FREELANCES_DEMO[index];
  const metier = METIERS.find((m) => m.id === freelance.metier);

  return (
    <div className="relative aspect-3/2 overflow-hidden">
      <div
        key={freelance.id}
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-gradient-to-br font-heading text-5xl font-semibold text-foreground/60 motion-safe:animate-[fade-in_0.6s_ease-out]",
          freelance.gradient,
        )}
      >
        {freelance.prenom.charAt(0)}
      </div>

      <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        En ligne
      </span>

      <button
        type="button"
        aria-label="Voir la présentation vidéo"
        className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg backdrop-blur-sm transition-transform hover:scale-105"
      >
        <Play className="size-5 fill-current pl-0.5" />
      </button>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-2.5 pt-6">
        <p className="text-sm font-semibold text-white">{freelance.prenom}</p>
        <p className="text-xs text-white/80">{metier?.label}</p>
      </div>
    </div>
  );
}
