import "server-only";
import Stripe from "stripe";

/**
 * Client Stripe côté serveur uniquement (clé secrète). Instancié à la
 * demande plutôt qu'au chargement du module, pour que le site
 * continue de fonctionner tant que STRIPE_SECRET_KEY n'est pas encore
 * configurée (voir proxy.ts pour le même principe côté Supabase) — les
 * seules routes qui en ont besoin sont celles du paiement.
 */
export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY n'est pas configurée. Le paiement n'est pas encore disponible.",
    );
  }
  return new Stripe(key);
}

export const TAUX_COMMISSION_DEFAUT = 15;
