import Link from "next/link";
import { Send, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { METIERS } from "@/config/metiers";

const FILIERE_EMOJIS: Record<string, string> = {
  securite: "🛡️",
  accueil: "🏨",
  vente: "🛍️",
};

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
          Trouvez les meilleurs freelances de terrain,{" "}
          <span className="text-primary">à la demande</span>
        </h1>

        <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-3">
          {METIERS.map((metier) => (
            <span
              key={metier.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3.5 py-1.5 text-sm font-medium text-cream-foreground/80"
            >
              <span aria-hidden="true">{FILIERE_EMOJIS[metier.id]}</span>
              {metier.filiere}
            </span>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-cream-foreground/80 sm:text-lg">
          ProParJour connecte les entreprises avec des freelances terrain
          qualifiés et vérifiés - agents de sécurité certifiés CNAPS, hôtes et
          hôtesses d&apos;accueil, vendeurs et personnel de commerce.
          Recrutement simple, contrats automatisés, facturation intégrée et
          paiements sécurisés - tout au même endroit.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            render={<Link href="/inscription/recruteur" />}
            size="lg"
            className="rounded-full"
          >
            <Send className="size-4" />
            Je recrute un prestataire
          </Button>
          <Button
            render={<Link href="/inscription/prestataire" />}
            size="lg"
            variant="outline"
            className="rounded-full"
          >
            <UserPlus className="size-4" />
            Je propose mes services
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 lg:px-8 lg:pb-24">
        <HeroVisual />
      </div>
    </section>
  );
}
