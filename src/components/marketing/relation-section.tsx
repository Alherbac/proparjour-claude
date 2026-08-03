import {
  Compass,
  Wallet,
  BadgeCheck,
  TrendingUp,
  Zap,
  LayoutGrid,
  PiggyBank,
  Sparkles,
  Handshake,
  type LucideIcon,
} from "lucide-react";
import { RevealOnScroll } from "@/components/motion/reveal-on-scroll";
import { cn } from "@/lib/utils";

type Avantage = { icon: LucideIcon; title: string; description: string };

const AVANTAGES_PRESTATAIRES: Avantage[] = [
  {
    icon: Compass,
    title: "Liberté de choisir",
    description: "Acceptez les missions qui vous correspondent, quand vous le souhaitez.",
  },
  {
    icon: Wallet,
    title: "Rémunération transparente",
    description: "Un tarif clair, fixé par vous, versé dès la mission validée.",
  },
  {
    icon: BadgeCheck,
    title: "Clients sérieux",
    description: "Des recruteurs vérifiés, entreprises et particuliers.",
  },
  {
    icon: TrendingUp,
    title: "Valorisation",
    description: "Construisez votre réputation grâce aux avis et à vos missions.",
  },
];

const AVANTAGES_ENTREPRISES: Avantage[] = [
  {
    icon: Zap,
    title: "Réactivité immédiate",
    description: "Trouvez un prestataire disponible en quelques minutes.",
  },
  {
    icon: LayoutGrid,
    title: "Simplicité opérationnelle",
    description: "Un panier unique pour réserver plusieurs profils en une commande.",
  },
  {
    icon: PiggyBank,
    title: "Optimisation des coûts",
    description: "Payez uniquement le temps de mission réellement nécessaire.",
  },
  {
    icon: Sparkles,
    title: "Expertise à la demande",
    description: "Sécurité, accueil, vente : des profils qualifiés pour chaque besoin.",
  },
];

function AvantageColumn({
  title,
  items,
  align = "left",
}: {
  title: string;
  items: Avantage[];
  align?: "left" | "right";
}) {
  return (
    <div>
      <h3
        className={cn(
          "font-heading text-2xl font-semibold text-foreground",
          align === "right" && "lg:text-right",
        )}
      >
        {title}
      </h3>
      <ul className="mt-6 space-y-5">
        {items.map(({ icon: Icon, title: itemTitle, description }) => (
          <li
            key={itemTitle}
            className={cn(
              "flex gap-3",
              align === "right" && "lg:flex-row-reverse lg:text-right",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="font-medium text-foreground">{itemTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RelationSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
      <RevealOnScroll className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Travailleurs indépendants et entreprises : une relation exclusive
          et profitable
        </h2>
      </RevealOnScroll>

      <div className="mt-14 grid items-center gap-12 lg:grid-cols-[1fr_auto_1fr]">
        <RevealOnScroll delayMs={0}>
          <AvantageColumn
            title="Pour les Prestataires Indépendants"
            items={AVANTAGES_PRESTATAIRES}
          />
        </RevealOnScroll>

        <RevealOnScroll
          delayMs={150}
          className="mx-auto flex size-32 shrink-0 items-center justify-center rounded-full bg-primary/10 lg:size-40"
        >
          <Handshake className="size-14 text-primary lg:size-16" />
        </RevealOnScroll>

        <RevealOnScroll delayMs={300}>
          <AvantageColumn
            title="Pour les Entreprises"
            items={AVANTAGES_ENTREPRISES}
            align="right"
          />
        </RevealOnScroll>
      </div>
    </section>
  );
}
