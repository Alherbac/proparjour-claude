import { Shield, HandHeart, ShoppingBag } from "lucide-react";
import { METIERS, type MetierId } from "@/config/metiers";
import { METIER_MOTS_CLES } from "@/lib/besoin";

/**
 * Habillage visuel (icône, emoji) par famille — s'ajoute à
 * METIERS (label/filiere/accent, config/metiers.ts) et
 * METIER_MOTS_CLES (synonymes, lib/besoin.ts) sans les dupliquer.
 * Seules les 3 filières réellement présentes au lancement.
 */
export const FAMILLE_METIERS: Record<MetierId, { emoji: string; icon: typeof Shield }> = {
  securite: { emoji: "🛡", icon: Shield },
  accueil: { emoji: "👋", icon: HandHeart },
  vente: { emoji: "🛍", icon: ShoppingBag },
};

export function infosFamille(metier: MetierId) {
  const m = METIERS.find((x) => x.id === metier)!;
  return { ...m, ...FAMILLE_METIERS[metier] };
}

export { METIER_MOTS_CLES };
