import Link from "next/link";
import { MarketingLogo } from "@/components/marketing/marketing-logo";

const FOOTER_COLUMNS = [
  {
    title: "Secteurs",
    links: [
      { href: "/prestataires?metier=securite", label: "Sécurité & Protection" },
      { href: "/prestataires?metier=accueil", label: "Accueil & Réception" },
      { href: "/prestataires?metier=vente", label: "Commerce & Retail" },
    ],
  },
  {
    title: "Plateforme",
    links: [
      { href: "/#comment", label: "Comment ça marche" },
      { href: "/#verification", label: "Vérification CNAPS" },
      { href: "/tarifs", label: "Tarifs & commission" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { href: "/a-propos", label: "À propos" },
      { href: "/cgu", label: "CGU" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-ink pb-9 pt-[60px] text-white/50">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 border-b border-white/9 px-10 pb-11 max-[900px]:grid-cols-2 max-[900px]:px-6">
        <div>
          <MarketingLogo tone="light" className="mb-[15px]" />
          <p className="max-w-[260px] text-[13.5px] leading-[1.65]">
            La plateforme de mise en relation entre entreprises et prestataires
            de terrain vérifiés : sécurité, accueil, commerce.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h5 className="mb-[17px] font-mono-landing text-[11px] uppercase tracking-[0.08em] text-white/35">
              {column.title}
            </h5>
            {column.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="mb-3 block text-sm text-white/65 transition-colors duration-150 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-10 pt-7 text-[12.5px] max-[900px]:px-6">
        <span>© {new Date().getFullYear()} ProParJour — Tous droits réservés</span>
        <span>Île-de-France</span>
      </div>
    </footer>
  );
}
