import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { TrustBar } from "@/components/marketing/trust-bar";
import { StatsStrip } from "@/components/marketing/stats-strip";
import {
  LANDING_BTN_ARROW,
  LANDING_BTN_BASE,
  LANDING_BTN_GHOST_DARK,
  LANDING_BTN_PRIMARY,
} from "@/components/marketing/button-styles";
import { cn } from "@/lib/utils";
import { getStatsPlateforme, getPrestatairesVedettes } from "@/lib/plateforme-stats";

export async function Hero() {
  const [stats, vedettes] = await Promise.all([getStatsPlateforme(), getPrestatairesVedettes()]);

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(60%_90%_at_82%_-10%,rgba(217,164,65,0.16)_0%,transparent_60%),radial-gradient(90%_120%_at_10%_0%,#16223B_0%,var(--color-ink)_60%)] pt-24 text-white">
      <div aria-hidden="true" className="hero-grain pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)_480px] items-center gap-16 px-10 pb-[88px] max-[1080px]:grid-cols-1 max-[900px]:px-6">
        <div className="max-w-[560px]">
          <span className="inline-flex items-center gap-[9px] font-mono-landing text-xs uppercase tracking-[0.12em] text-white/50 before:size-1.5 before:rounded-full before:bg-emerald before:shadow-[0_0_0_4px_rgba(24,154,108,0.14)] before:content-['']">
            Freelances de terrain vérifiés
          </span>

          <h1 className="my-6 text-[56px] leading-[1.08] font-semibold tracking-[-0.02em]">
            Trouvez les meilleurs
            <br />
            freelances de terrain,
            <br />
            <span className="bg-[linear-gradient(95deg,var(--color-gold)_0%,#F0C878_60%,var(--color-gold)_100%)] bg-clip-text text-transparent">
              à la demande.
            </span>
          </h1>

          <p className="mb-9 max-w-[490px] text-[17px] leading-[1.65] text-white/66">
            Agents de sécurité certifiés CNAPS, hôtes et hôtesses, vendeurs et
            personnel de commerce — vérifiés, notés, disponibles en
            Île-de-France. Contrat, facturation et paiement gérés
            automatiquement.
          </p>

          <div className="mb-[52px] flex flex-wrap gap-3">
            <Button
              render={<Link href="/prestataires" />}
              className={cn(LANDING_BTN_BASE, LANDING_BTN_PRIMARY, "group")}
            >
              Je recrute un prestataire
              <span className={LANDING_BTN_ARROW}>→</span>
            </Button>
            <Button
              render={<Link href="/inscription/prestataire" />}
              className={cn(LANDING_BTN_BASE, LANDING_BTN_GHOST_DARK)}
            >
              <UserPlus className="size-4" />
              Je deviens prestataire
            </Button>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="flex">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="-ml-[9px] size-[34px] rounded-full border-[2.5px] border-ink bg-[linear-gradient(135deg,#2B3B57,#3F5578)] first:ml-0"
                />
              ))}
            </div>
            <p className="text-[13px] leading-[1.4] text-white/50">
              <b className="font-semibold text-white">{stats.prestatairesValides} prestataires</b>{" "}
              vérifiés actifs en Île-de-France
            </p>
          </div>
        </div>

        <HeroVisual vedettes={vedettes} />
      </div>

      <TrustBar />
      <StatsStrip prestatairesValides={stats.prestatairesValides} />
    </section>
  );
}
