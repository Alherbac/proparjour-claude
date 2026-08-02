import Link from "next/link";
import { Logo } from "@/components/layout/logo";

const FOOTER_COLUMNS = [
  {
    title: "Plateforme",
    links: [
      { href: "/prestataires", label: "Trouver un prestataire" },
      { href: "/comment-ca-marche", label: "Comment ça marche" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Prestataires",
    links: [
      { href: "/inscription/prestataire", label: "Devenir prestataire" },
      { href: "/metiers/securite", label: "Agents de sécurité" },
      { href: "/metiers/accueil", label: "Hôtes et hôtesses" },
      { href: "/metiers/vente", label: "Vendeurs & commerciaux" },
    ],
  },
  {
    title: "Entreprises",
    links: [
      { href: "/inscription/recruteur", label: "Recruter un prestataire" },
      { href: "/entreprises", label: "Espace entreprise" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/cgu", label: "CGU" },
      { href: "/confidentialite", label: "Confidentialité" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))] lg:px-8">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            La plateforme de mise en relation avec des freelances de terrain
            qualifiés, disponibles à la demande en Île-de-France.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title} className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {column.title}
            </h3>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground lg:px-8">
        © {new Date().getFullYear()} ProParJour. Tous droits réservés.
      </div>
    </footer>
  );
}
