/**
 * URL publique de base du site, par environnement (audit prod A7).
 *
 * Priorité :
 *   1. NEXT_PUBLIC_BASE_URL (défini explicitement en dev / staging / prod) ;
 *   2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL (déploiements Vercel) ;
 *   3. repli sur le domaine de production.
 *
 * Ne jamais coder en dur une URL de staging dans le code applicatif :
 * les liens d'e-mails et les URL canoniques doivent suivre
 * l'environnement de déploiement.
 */
export function baseUrl(): string {
  const explicite = process.env.NEXT_PUBLIC_BASE_URL;
  if (explicite) return explicite.replace(/\/$/, "");

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "https://proparjour.fr";
}

export const BASE_URL = baseUrl();
