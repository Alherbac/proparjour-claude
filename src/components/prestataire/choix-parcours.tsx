import Link from "next/link";
import { Search, Send, ArrowRight } from "lucide-react";

export function ChoixParcours() {
  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="text-center">
        <h1
          className="text-ppj-ink"
          style={{ fontFamily: "var(--font-display-serif)", fontSize: "clamp(30px,3.4vw,44px)", lineHeight: 1.05, letterSpacing: "-0.02em" }}
        >
          Que souhaitez-vous faire ?
        </h1>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <Link
          href="/prestataires?mode=recherche"
          className="group flex min-h-[264px] flex-col justify-between rounded-[20px] border border-ppj-line bg-white p-7 transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,0.84,0.44,1)] hover:-translate-y-1.5 hover:border-ppj-ink hover:shadow-[var(--shadow-ppj-card)] motion-reduce:transition-none"
        >
          <div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Search className="size-5" />
            </div>
            <h2 className="mb-2 mt-5 font-heading text-xl font-semibold text-foreground">
              Trouver un professionnel
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Je veux consulter les profils et choisir moi-même.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between text-sm font-semibold text-foreground">
            <span>Explorer les profils</span>
            <ArrowRight className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.16,0.84,0.44,1)] group-hover:translate-x-1 motion-reduce:transition-none" />
          </div>
        </Link>

        <Link
          href="/prestataires?mode=publier"
          className="group flex min-h-[264px] flex-col justify-between overflow-hidden rounded-[28px] bg-gradient-to-br from-primary via-primary to-red-900 p-7 text-white transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,0.84,0.44,1)] hover:-translate-y-1.5 hover:shadow-[var(--shadow-landing-lg)] motion-reduce:transition-none"
        >
          <div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
              <Send className="size-5" />
            </div>
            <h2 className="mb-2 mt-5 font-heading text-xl font-semibold">Publier un besoin</h2>
            <p className="text-sm leading-relaxed text-white/75">
              Je décris ce dont j&apos;ai besoin et ProParJour l&apos;envoie aux professionnels concernés.
            </p>
          </div>
          <div className="mt-6 flex items-center justify-between text-sm font-semibold">
            <span>Décrire mon besoin</span>
            <ArrowRight className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.16,0.84,0.44,1)] group-hover:translate-x-1 motion-reduce:transition-none" />
          </div>
        </Link>
      </div>
    </div>
  );
}
