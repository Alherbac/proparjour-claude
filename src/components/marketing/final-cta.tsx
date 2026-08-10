import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "@/components/motion/reveal-on-scroll";
import {
  LANDING_BTN_ARROW,
  LANDING_BTN_BASE,
  LANDING_BTN_GHOST_LIGHT,
  LANDING_BTN_PRIMARY,
} from "@/components/marketing/button-styles";
import { cn } from "@/lib/utils";

export function FinalCta() {
  return (
    <section className="px-10 pb-[140px] pt-[120px] text-center max-[900px]:px-6">
      <RevealOnScroll className="mx-auto max-w-[1200px]">
        <span className="inline-flex items-center justify-center gap-[9px] font-mono-landing text-xs font-medium uppercase tracking-[0.12em] text-muted-landing before:size-1.5 before:rounded-full before:bg-emerald before:shadow-[0_0_0_4px_rgba(24,154,108,0.14)] before:content-['']">
          Prêt en quelques minutes
        </span>
        <h2 className="mx-auto mt-5 mb-[18px] max-w-[660px] text-[42px] font-semibold text-ink">
          Trouvez votre prestataire du jour, ou votre prochaine mission.
        </h2>
        <p className="mx-auto mb-9 max-w-[500px] text-[16.5px] text-muted-landing">
          Recrutement, contrat, facturation et paiement — tout au même endroit,
          vérifié à chaque étape.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            render={<Link href="/prestataires" />}
            className={cn(LANDING_BTN_BASE, LANDING_BTN_PRIMARY, "group")}
          >
            Je recrute un prestataire
            <span className={LANDING_BTN_ARROW}>→</span>
          </Button>
          <Button
            render={<Link href="/inscription/prestataire" />}
            className={cn(LANDING_BTN_BASE, LANDING_BTN_GHOST_LIGHT)}
          >
            <UserPlus className="size-4" />
            Je deviens prestataire
          </Button>
        </div>
      </RevealOnScroll>
    </section>
  );
}
