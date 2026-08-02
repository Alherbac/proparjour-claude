/**
 * Les 3 filières de prestataires proposées au lancement — voir
 * cahier-des-charges.md, sections 2.2 et 4.
 *
 * Chaque filière a sa couleur d'accent (utilisée uniquement sur ses
 * propres cartes/badges — le rouge reste la couleur de marque
 * dominante partout ailleurs). Classes Tailwind stockées en littéral
 * pour rester détectables par le scanner JIT.
 */

export const METIERS = [
  {
    id: "securite",
    label: "Agent de sécurité",
    filiere: "Sécurité privée",
    justificatifRequis: "Carte professionnelle CNAPS",
    accent: {
      text: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500",
      bgSoft: "bg-blue-500/10",
      border: "border-blue-500/30",
      borderHover: "hover:border-blue-500",
      gradient: "from-blue-500/25 via-blue-500/10 to-transparent",
      ring: "ring-blue-500/40",
    },
  },
  {
    id: "accueil",
    label: "Hôte / Hôtesse d'accueil",
    filiere: "Accueil & Réception",
    justificatifRequis: null,
    accent: {
      text: "text-fuchsia-600 dark:text-fuchsia-400",
      bg: "bg-fuchsia-500",
      bgSoft: "bg-fuchsia-500/10",
      border: "border-fuchsia-500/30",
      borderHover: "hover:border-fuchsia-500",
      gradient: "from-fuchsia-500/25 via-fuchsia-500/10 to-transparent",
      ring: "ring-fuchsia-500/40",
    },
  },
  {
    id: "vente",
    label: "Vendeur / Commercial",
    filiere: "Commerce & Retail",
    justificatifRequis: null,
    accent: {
      text: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-500",
      bgSoft: "bg-orange-500/10",
      border: "border-orange-500/30",
      borderHover: "hover:border-orange-500",
      gradient: "from-orange-500/25 via-orange-500/10 to-transparent",
      ring: "ring-orange-500/40",
    },
  },
] as const;

export type MetierId = (typeof METIERS)[number]["id"];
