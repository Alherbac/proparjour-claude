import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroVisual } from "@/components/marketing/hero-visual";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-cream to-cream/40 text-cream-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 -z-10 size-[28rem] rounded-full bg-primary/25 blur-3xl animate-mesh-drift"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-32 -z-10 size-[26rem] rounded-full bg-orange-400/20 blur-3xl animate-mesh-drift"
        style={{ animationDelay: "-6s" }}
      />

      <div className="mx-auto max-w-6xl px-4 py-16 text-center lg:px-8 lg:py-24">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="size-3.5" />
          Disponible en Île-de-France
        </span>

        <h1 className="mx-auto mt-5 font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:whitespace-nowrap lg:text-[2.75rem] xl:text-5xl">
          Trouvez les meilleurs freelances de terrain, à la demande
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-cream-foreground/80 sm:text-lg">
          Réservez en quelques clics des agents de sécurité certifiés CNAPS,
          des hôtes et hôtesses d&apos;accueil, ou des vendeurs et personnel
          de commerce, disponibles à la journée, à l&apos;heure ou sur une
          mission courte.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            render={<Link href="/inscription/recruteur" />}
            size="lg"
            className="rounded-full"
          >
            Je recrute
          </Button>
          <Button
            render={<Link href="/inscription/prestataire" />}
            size="lg"
            variant="outline"
            className="rounded-full border-primary text-primary hover:bg-primary/10 hover:text-primary"
          >
            Je suis prestataire
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 lg:px-8 lg:pb-24">
        <HeroVisual />
      </div>
    </section>
  );
}
