import { Check, X, Circle } from "lucide-react";
import type { EtatCritere } from "@/lib/matching";

/**
 * Lot F §15 — un seul endroit qui décide de l'icône/du ton associés
 * aux trois états d'un critère, réutilisé par toutes les surfaces qui
 * affichent une checklist de matching (cartes de recommandation,
 * fiche profil, comparaison, opportunités prestataire). Jamais de
 * logique dupliquée ni divergente entre ces écrans — un même état
 * s'affiche toujours de la même façon partout.
 */
export function IconeCritere({ etat, className }: { etat: EtatCritere; className?: string }) {
  if (etat === "correspond") return <Check className={className} />;
  if (etat === "ne_correspond_pas") return <X className={className} />;
  return <Circle className={className} />;
}

/** Classes de texte associées à chaque état — correspond (plein), ne_correspond_pas (barré/atténué), non_renseigne (atténué, sans barré : ce n'est pas un refus). */
export function classeTexteCritere(etat: EtatCritere): string {
  if (etat === "correspond") return "";
  if (etat === "ne_correspond_pas") return "line-through opacity-60";
  return "opacity-60";
}
