import { FreelanceCard } from "@/components/marketing/freelance-card";
import { RevealOnScroll } from "@/components/motion/reveal-on-scroll";
import { FREELANCES_DEMO } from "@/data/freelances-demo";

// Doublé pour un défilement en boucle sans coupure : l'animation
// translate exactement -50% (voir .animate-marquee), soit la largeur
// d'un seul jeu de cartes.
const MARQUEE_ITEMS = [...FREELANCES_DEMO, ...FREELANCES_DEMO];

export function FreelancesCarousel() {
  return (
    <section id="freelances" className="overflow-hidden bg-secondary/30 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <RevealOnScroll className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Freelances de la région
          </h2>
          <p className="mt-3 text-muted-foreground">
            Des professionnels qualifiés près de chez vous en Île-de-France.
          </p>
        </RevealOnScroll>
      </div>

      <div className="group relative mt-12 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <div className="flex w-max gap-6 motion-safe:animate-marquee motion-safe:group-hover:[animation-play-state:paused]">
          {MARQUEE_ITEMS.map((freelance, index) => (
            <div key={`${freelance.id}-${index}`} className="w-64 shrink-0 sm:w-72">
              <FreelanceCard freelance={freelance} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
