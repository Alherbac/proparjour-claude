import Link from "next/link";
import { ArrowUpRight, Shield, ShoppingBag, Users, type LucideIcon } from "lucide-react";
import { METIERS, type MetierId } from "@/config/metiers";
import { RevealOnScroll } from "@/components/motion/reveal-on-scroll";
import { cn } from "@/lib/utils";

const FILIERE_ICONS: Record<MetierId, LucideIcon> = {
  securite: Shield,
  accueil: Users,
  vente: ShoppingBag,
};

const FILIERE_DESCRIPTIONS: Record<MetierId, string> = {
  securite:
    "Agents certifiés CNAPS pour vos sites, événements et commerces.",
  accueil:
    "Hôtes et hôtesses pour vos salons, soirées et accueils d'entreprise.",
  vente:
    "Vendeurs et personnel de commerce pour renforcer vos équipes.",
};

// Rotation + décalage vertical par carte, pour l'effet d'éventail en
// chevauchement diagonal — appliqués sur un wrapper séparé de
// RevealOnScroll pour ne pas entrer en conflit avec sa propre
// transform d'apparition.
const FAN_CLASSES = [
  "lg:rotate-[-4deg] lg:translate-y-3",
  "lg:-translate-y-4 lg:scale-105",
  "lg:rotate-[4deg] lg:translate-y-3",
];

export function FiliereSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
      <RevealOnScroll className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Trois filières, un seul endroit
        </h2>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Chaque filière a ses propres exigences — ProParJour vérifie les
          bons justificatifs pour chacune d&apos;elles.
        </p>
      </RevealOnScroll>

      <div className="mt-16 grid gap-6 lg:mt-24 lg:grid-cols-3 lg:gap-4">
        {METIERS.map((metier, index) => {
          const Icon = FILIERE_ICONS[metier.id];
          return (
            <div
              key={metier.id}
              className={cn(
                "lg:transition-transform lg:duration-500",
                FAN_CLASSES[index],
                index === 1 && "relative z-10",
              )}
            >
              <RevealOnScroll delayMs={index * 120}>
                <Link
                  href={`/prestataires?metier=${metier.id}`}
                  className={cn(
                    "group block h-full rounded-3xl border bg-background p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg",
                    metier.accent.border,
                  )}
                >
                  <span
                    className={cn(
                      "flex size-14 items-center justify-center rounded-2xl",
                      metier.accent.bgSoft,
                      metier.accent.text,
                    )}
                  >
                    <Icon className="size-7" />
                  </span>
                  <h3 className="mt-6 font-heading text-xl font-semibold text-foreground">
                    {metier.filiere}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {FILIERE_DESCRIPTIONS[metier.id]}
                  </p>
                  <span
                    className={cn(
                      "mt-6 inline-flex items-center gap-1 text-sm font-medium",
                      metier.accent.text,
                    )}
                  >
                    Voir les profils
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </RevealOnScroll>
            </div>
          );
        })}
      </div>
    </section>
  );
}
