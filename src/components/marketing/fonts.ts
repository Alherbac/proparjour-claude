import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";

/**
 * Polices dédiées à l'identité "carte pro" de la page marketing —
 * chargées uniquement dans (marketing)/layout.tsx, jamais dans le
 * layout racine, pour ne pas affecter la typographie du dashboard/admin.
 */
export const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const interLanding = Inter({
  variable: "--font-inter-landing",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const marketingFontVariables = `${spaceGrotesk.variable} ${interLanding.variable} ${ibmPlexMono.variable}`;
