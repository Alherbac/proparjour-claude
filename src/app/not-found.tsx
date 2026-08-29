import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

// Audit final, §01 — page 404 habillée : `not-found.tsx` à la racine
// de src/app rend en dehors du layout (marketing) (pas de Header/
// Footer), donc dans le layout racine seul (ThemeProvider/Toaster/
// CookieConsentBanner, voir src/app/layout.tsx) — on reconstitue ici
// un en-tête minimal, même pattern que connexion-form.tsx. Carte
// d'état vide reprenant le style déjà utilisé pour "Votre panier est
// vide" (panier-content.tsx) : pastille serif, titre, message, un
// seul bouton (demande explicite — pas de second lien de sortie).
export default function NotFound() {
  return (
    <div className="min-h-full bg-secondary/30">
      <header className="border-b border-border bg-background px-4 py-4 lg:px-8">
        <Logo />
      </header>
      <div className="mx-auto max-w-md px-4 py-16 text-center lg:px-8">
        <span
          className="inline-grid size-12 place-items-center rounded-[14px] border border-ppj-line bg-ppj-field text-[22px] text-primary"
          style={{ fontFamily: "var(--font-display-serif)" }}
        >
          404
        </span>
        <p
          className="mx-auto mt-4 mb-2 text-ppj-ink"
          style={{ fontFamily: "var(--font-display-serif)", fontSize: "26px", letterSpacing: "-0.01em" }}
        >
          Cette page n&apos;existe pas ou n&apos;est plus accessible
        </p>
        <p className="mx-auto mb-6 max-w-[34em] text-[14.5px] leading-[1.6] text-ppj-text-3">
          Vérifiez l&apos;adresse, ou repartez de l&apos;accueil pour retrouver votre chemin.
        </p>
        <Button
          render={<Link href="/" />}
          className="min-h-12 rounded-[13px] bg-primary px-[22px] text-[15px] font-semibold text-white hover:bg-[#B8130F]"
        >
          Retour à l&apos;accueil
        </Button>
      </div>
    </div>
  );
}
