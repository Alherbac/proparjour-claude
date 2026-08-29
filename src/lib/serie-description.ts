/**
 * Marqueur partagé entre la création de série (côté client, ajout au
 * panier) et le rattachement post-paiement (server action) — extrait
 * dans un module neutre car une Server Action ("use server") ne peut
 * exporter que des fonctions async, voir actions/series.ts.
 */
export function descriptionSerie(titre: string): string {
  return `Série récurrente : ${titre}`;
}
