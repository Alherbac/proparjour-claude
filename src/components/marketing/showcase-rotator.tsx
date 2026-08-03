"use client";

import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { METIERS } from "@/config/metiers";
import { FREELANCES_DEMO } from "@/data/freelances-demo";
import { cn } from "@/lib/utils";

const ROTATION_MS = 3200;

/**
 * Dégradés riches et saturés, distincts des dégradés pâles utilisés
 * pour les petits avatars — nécessaires ici pour que la carte se lise
 * comme une vraie mise en situation (pas un rectangle vide) en
 * attendant de vraies photos uploadées.
 */
const SHOWCASE_GRADIENTS = [
  "from-blue-600 to-slate-900",
  "from-amber-500 to-orange-800",
  "from-emerald-500 to-teal-800",
  "from-fuchsia-500 to-purple-800",
  "from-rose-500 to-red-800",
  "from-sky-500 to-indigo-800",
];

const ROTATION_MS_KEY = ROTATION_MS;

export function ShowcaseRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % FREELANCES_DEMO.length);
    }, ROTATION_MS_KEY);
    return () => clearInterval(id);
  }, []);

  const freelance = FREELANCES_DEMO[index];
  const metier = METIERS.find((m) => m.id === freelance.metier);
  const gradient = SHOWCASE_GRADIENTS[index % SHOWCASE_GRADIENTS.length];

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        key={freelance.id}
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-gradient-to-br font-heading text-8xl font-semibold text-white/90 motion-safe:animate-[fade-in_0.6s_ease-out]",
          gradient,
        )}
      >
        {freelance.prenom.charAt(0)}
      </div>

      <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 text-[13px] font-medium text-white">
        <span className="size-1.5 rounded-full bg-red-500" />
        En ligne
      </span>

      <span className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 shadow-lg backdrop-blur-sm">
        <Play className="ml-0.5 size-5 fill-foreground text-foreground" />
      </span>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
        <p className="text-sm font-semibold text-white">{freelance.prenom}</p>
        <p className="text-xs text-white/80">{metier?.label}</p>
      </div>
    </div>
  );
}
