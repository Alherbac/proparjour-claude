/**
 * Pont minimal entre la création d'une série (Bloc 7) et le paiement
 * panier existant : mémorise l'id de la série le temps du checkout,
 * pour que CheckoutForm puisse rattacher les missions créées une fois
 * le paiement confirmé (voir rattacherMissionsASerie dans
 * actions/series.ts). Ne stocke rien d'autre — les lignes elles-mêmes
 * passent par le panier normal (lib/panier.ts).
 */
const STORAGE_KEY = "proparjour:serie-en-attente";

export function memoriserSerieEnAttente(serieId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, serieId);
}

export function lireSerieEnAttente(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function oublierSerieEnAttente() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
