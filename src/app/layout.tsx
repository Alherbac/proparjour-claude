import type { Metadata } from "next";
import { Public_Sans, IBM_Plex_Mono, Fraunces, Instrument_Serif } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import "./globals.css";

// Corps de texte et UI dans tout le produit (remplace Geist — refonte
// 110790prodesign, Lot 0). Public Sans reste lisible à toutes les
// tailles, contrairement à une display face, d'où le remplacement
// direct de --font-geist-sans plutôt qu'une nouvelle variable.
const publicSans = Public_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Étiquettes techniques (refonte 110790prodesign) — remplace Geist
// Mono, déjà chargée séparément par le marketing sous un autre nom ;
// la variable racine la rend disponible partout.
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Conservée telle quelle : --font-serif/--font-heading est utilisée
// pour de nombreux titres de carte en petite taille dans le
// dashboard/admin existant, où Instrument Serif (display, très fine)
// rendrait mal. Instrument Serif est ajoutée à côté, réservée aux
// grands titres (H1/H2, refonte 110790prodesign) — voir --font-display-serif.
const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

// Audit final — metadataBase manquait : les URLs relatives (Open
// Graph notamment) ne se résolvaient jamais en URL absolue valide.
// Open Graph/Twitter ajoutés a minima (titre/description déjà
// définis, aucune image dédiée créée ici — pas de donnée inventée).
export const metadata: Metadata = {
  metadataBase: new URL("https://proparjour.fr"),
  title: {
    default: "ProParJour — Freelances de terrain, à la demande",
    template: "%s — ProParJour",
  },
  description:
    "Trouvez et réservez des agents de sécurité, hôtes/hôtesses d'accueil et vendeurs freelances en Île-de-France.",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "ProParJour",
    title: "ProParJour — Freelances de terrain, à la demande",
    description:
      "Trouvez et réservez des agents de sécurité, hôtes/hôtesses d'accueil et vendeurs freelances en Île-de-France.",
  },
  twitter: {
    card: "summary",
    title: "ProParJour — Freelances de terrain, à la demande",
    description:
      "Trouvez et réservez des agents de sécurité, hôtes/hôtesses d'accueil et vendeurs freelances en Île-de-France.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${publicSans.variable} ${ibmPlexMono.variable} ${fraunces.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <CookieConsentBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
