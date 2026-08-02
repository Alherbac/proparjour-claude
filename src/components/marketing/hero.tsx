import Link from "next/link";
import { ShieldCheck, CreditCard, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FiliereBadges } from "@/components/marketing/filiere-badges";
import { HeroVisual } from "@/components/marketing/hero-visual";

const REASSURANCE = [
  { icon: ShieldCheck, label: "Profils vérifiés" },
  { icon: CreditCard, label: "Paiement sécurisé" },
  { icon: Headphones, label: "Assistance 24/7" },
];

export function Hero() {
  return (
    <section className="bg-cream text-cream-foreground">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <div>
          <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Trouvez les meilleurs freelances de terrain,{" "}
            <span className="text-primary">à la demande</span>
          </h1>

          <FiliereBadges className="mt-6" />

          <p className="mt-6 max-w-xl text-base leading-relaxed text-cream-foreground/80 sm:text-lg">
            Réservez en quelques clics des agents de sécurité certifiés
            CNAPS, des hôtes et hôtesses d&apos;accueil, ou des vendeurs et
            personnel de commerce, disponibles à la journée, à l&apos;heure
            ou sur une mission courte.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              render={<Link href="/inscription/recruteur" />}
              size="lg"
              className="rounded-full"
            >
              Je recrute un prestataire
            </Button>
            <Button
              render={<Link href="/inscription/prestataire" />}
              size="lg"
              variant="outline"
              className="rounded-full border-primary text-primary hover:bg-primary/10 hover:text-primary"
            >
              Je propose mes services
            </Button>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            {REASSURANCE.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="size-5 text-primary" />
                <dt className="text-sm font-medium text-cream-foreground/80">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}
