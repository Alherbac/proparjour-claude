import Link from "next/link";
import { ShieldCheck, Lock, BookmarkCheck } from "lucide-react";
import { HeroSearchBar } from "@/components/marketing/hero-search-bar";

// Refonte Claude Istanbul 1, §4.2 — trois pilules de familles, chacune
// lance la recherche sur sa famille (réutilise le filtre ?metier=
// déjà supporté par /prestataires, aucune nouvelle logique). Emoji et
// libellés courts repris tels quels de la maquette (heroChips) — un
// jeu distinct des libellés longs de la section "Les métiers".
const PILULES = [
  { metier: "securite", label: "Sécurité privée", emoji: "🛡️" },
  { metier: "accueil", label: "Accueil & Réception", emoji: "🏨" },
  { metier: "vente", label: "Commerce & Retail", emoji: "🛍️" },
] as const;

// Icônes au trait rouge de la maquette — la 3e est un signet coché
// (BookmarkCheck), pas un document.
const CONFIANCE = [
  { Icon: ShieldCheck, label: "Professionnels vérifiés" },
  { Icon: Lock, label: "Paiement sécurisé" },
  { Icon: BookmarkCheck, label: "Missions encadrées" },
] as const;

// Tailwind v4 n'interprète pas fiablement clamp() à plusieurs
// arguments séparés par des virgules dans une classe arbitraire
// (text-[clamp(...)] etc.) — la classe est silencieusement ignorée.
// Toutes les tailles/paddings fluides du README passent donc par des
// styles inline, jamais par des classes arbitraires.
export function Hero() {
  return (
    <section
      id="recherche"
      className="bg-background px-6"
      style={{ paddingTop: "clamp(44px,6vw,84px)", paddingBottom: "clamp(56px,7vw,96px)" }}
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="mx-auto mb-8 text-center">
          <h1
            className="mx-auto mb-[22px] max-w-[22em] tracking-[-0.022em] text-ppj-ink"
            style={{
              fontFamily: "var(--font-display-serif)",
              fontSize: "clamp(38px,4.4vw,62px)",
              lineHeight: 1.04,
              textWrap: "balance",
            }}
          >
            Trouvez les meilleurs freelances de terrain,{" "}
            <em className="not-italic text-primary">à la demande</em>
          </h1>

          <div className="mb-6 flex flex-wrap justify-center gap-2.5">
            {PILULES.map(({ metier, label, emoji }) => (
              <Link
                key={metier}
                href={`/prestataires?metier=${metier}`}
                className="inline-flex items-center gap-2 rounded-full border border-ppj-line bg-white px-[18px] py-2.5 text-[15px] text-ppj-ink transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-ppj-ink"
              >
                <span className="shrink-0 text-base leading-none" aria-hidden>
                  {emoji}
                </span>
                {label}
              </Link>
            ))}
          </div>

          <p
            className="mx-auto max-w-[100ch] text-ppj-text-3"
            style={{ fontSize: "clamp(15px,1.15vw,16.5px)", lineHeight: 1.68, textWrap: "pretty" }}
          >
            ProParJour connecte les entreprises avec des freelances terrain qualifiés et vérifiés —
            agents de sécurité certifiés CNAPS, hôtes et hôtesses d&apos;accueil, vendeurs et personnel
            de commerce. Recrutement simple, contrats automatisés, facturation intégrée et paiements
            sécurisés — tout au même endroit.
          </p>
        </div>

        <HeroSearchBar />

        <div className="mt-10 flex flex-wrap justify-center gap-[22px]">
          {CONFIANCE.map(({ Icon, label }) => (
            <span key={label} className="flex items-center gap-2 text-[13.5px] text-ppj-text-2">
              <Icon className="size-[17px] shrink-0 text-primary" strokeWidth={2} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
