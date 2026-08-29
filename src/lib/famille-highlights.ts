import type { PrestatairesPublicsRow } from "@/lib/supabase/database.types";

/**
 * "Pourquoi ce profil" — 1 à 2 signaux réels, spécifiques à la
 * famille de métier, à afficher sur une carte de recherche simple
 * (sans date/ville, donc sans score du moteur de matching, cf.
 * lib/matching.ts qui a besoin d'une date pour calculer une
 * disponibilité). Chaque signal n'apparaît que si la donnée existe
 * réellement sur le profil — jamais de critère générique inventé
 * pour "remplir" la carte.
 */
export function highlightsFamille(prestataire: PrestatairesPublicsRow): string[] {
  const highlights: string[] = [];

  if (prestataire.metier === "securite") {
    if (prestataire.cnaps_verifie) highlights.push("Carte professionnelle CNAPS vérifiée");
  }

  if (prestataire.metier === "accueil") {
    // Quelques profils historiques ont une entrée mal formée (objet
    // JSON stocké tel quel au lieu d'un nom de langue) — filtrée
    // plutôt qu'affichée brute, sans toucher à la donnée en base.
    const languesValides = prestataire.langues.filter((l) => !l.trim().startsWith("{"));
    if (languesValides.length > 0) {
      highlights.push(`Parle ${languesValides.slice(0, 2).join(" et ")}`);
    }
  }

  if (prestataire.metier === "vente") {
    if (prestataire.competences.length > 0) {
      highlights.push(prestataire.competences.slice(0, 2).join(" · "));
    }
  }

  if (highlights.length === 0 && prestataire.certifications.length > 0) {
    highlights.push(prestataire.certifications.slice(0, 2).join(" · "));
  }

  return highlights.slice(0, 2);
}
