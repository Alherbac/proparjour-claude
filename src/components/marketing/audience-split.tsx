import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "@/components/motion/reveal-on-scroll";
import { SectionHead } from "@/components/marketing/section-head";
import {
  LANDING_BTN_BASE,
  LANDING_BTN_GHOST_LIGHT,
  LANDING_BTN_PRIMARY,
} from "@/components/marketing/button-styles";
import { cn } from "@/lib/utils";

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-[11px] py-2.5 text-sm">
      <span className="mt-px flex size-[18px] flex-none items-center justify-center rounded-[6px] bg-emerald">
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M1 5l3 3 5-6" stroke="#0A0F1C" strokeWidth="1.6" fill="none" />
        </svg>
      </span>
      {children}
    </li>
  );
}

function SplitCard({
  eyebrow,
  titre,
  description,
  items,
  cta,
  ctaHref,
  tone,
}: {
  eyebrow: string;
  titre: string;
  description: string;
  items: string[];
  cta: string;
  ctaHref: string;
  tone: "dark" | "light";
}) {
  const isDark = tone === "dark";
  return (
    <div
      className={cn(
        "rounded-[24px] border-[1.5px] px-[38px] py-11 transition-shadow duration-[250ms] ease-[cubic-bezier(0.16,0.84,0.44,1)] hover:shadow-[var(--shadow-landing-md)] motion-reduce:transition-none",
        isDark ? "border-ink bg-ink text-white" : "border-line bg-white text-ink",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-[9px] font-mono-landing text-xs font-medium uppercase tracking-[0.12em] before:size-1.5 before:rounded-full before:bg-emerald before:shadow-[0_0_0_4px_rgba(24,154,108,0.14)] before:content-['']",
          isDark ? "text-white/50" : "text-muted-landing",
        )}
      >
        {eyebrow}
      </span>
      <h3 className="mb-3.5 mt-[18px] text-2xl font-semibold">{titre}</h3>
      <p className={cn("mb-6 text-[14.5px] leading-[1.65]", isDark ? "text-white/62" : "text-muted-landing")}>
        {description}
      </p>
      <ul className="mb-7">
        {items.map((item, index) => (
          <div
            key={item}
            className={cn(
              "border-t",
              isDark ? "border-white/10" : "border-line",
              index === 0 && "border-t-0",
            )}
          >
            <CheckItem>{item}</CheckItem>
          </div>
        ))}
      </ul>
      <Button
        render={<Link href={ctaHref} />}
        className={cn(LANDING_BTN_BASE, isDark ? LANDING_BTN_PRIMARY : LANDING_BTN_GHOST_LIGHT)}
      >
        {cta}
      </Button>
    </div>
  );
}

export function AudienceSplit() {
  return (
    <section id="recruter" className="py-32 max-[900px]:py-20">
      <div className="mx-auto max-w-[1200px] px-10 max-[900px]:px-6">
        <RevealOnScroll>
          <SectionHead eyebrow="Deux côtés, un seul flux" titre="Que vous recrutiez ou que vous soyez sur le terrain" />
        </RevealOnScroll>
        <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
          <RevealOnScroll>
            <SplitCard
              tone="dark"
              eyebrow="Entreprises & particuliers"
              titre="Vous recrutez"
              description="Trouvez un agent, un hôte ou un vendeur pour une journée, un événement ou une mission récurrente — sans passer par une agence."
              items={[
                "Profils vérifiés CNAPS et documents à jour",
                "Panier multi-prestataires, même sur des créneaux différents",
                "Contrat, facture et paiement centralisés",
              ]}
              cta="Trouver un prestataire"
              ctaHref="/prestataires"
            />
          </RevealOnScroll>
          <RevealOnScroll delayMs={80}>
            <div id="prestataires">
              <SplitCard
                tone="light"
                eyebrow="Freelances de terrain"
                titre="Vous êtes prestataire"
                description="Créez votre carte de profil, indiquez vos disponibilités et recevez des missions près de chez vous, sans démarchage."
                items={[
                  "Vérification une fois, valable sur toutes vos missions",
                  "Calendrier de disponibilités que vous seul contrôlez",
                  "Paiement débloqué dès la mission confirmée",
                ]}
                cta="Créer ma carte pro"
                ctaHref="/inscription/prestataire"
              />
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
