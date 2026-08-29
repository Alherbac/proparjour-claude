export const COOKIE_CONSENT_STORAGE_KEY = "ppj_cookies_consent";
export const COOKIE_CONSENT_EVENT = "proparjour:cookies-consent-update";

/**
 * Catégories RGPD (cahier des charges §6.2). "essentiels" n'est
 * jamais désactivable — nécessaire au fonctionnement du site
 * (session, panier, CSRF). Les deux autres catégories n'ont
 * aujourd'hui aucun script réel branché derrière (pas de mesure
 * d'audience ni de pixel marketing dans ce projet) — le consentement
 * est collecté et respecté par avance, pour que le jour où l'un de
 * ces outils est ajouté, il se branche sur un choix déjà réel de
 * l'utilisateur plutôt que d'en réclamer un nouveau après coup.
 */
export type ConsentementCookies = {
  essentiels: true;
  audience: boolean;
  marketing: boolean;
  date: string;
};

export function lireConsentement(): ConsentementCookies | null {
  if (typeof window === "undefined") return null;
  try {
    const brut = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!brut) return null;
    const parsed = JSON.parse(brut) as ConsentementCookies;
    return parsed?.essentiels === true ? parsed : null;
  } catch {
    return null;
  }
}

export function ecrireConsentement(choix: { audience: boolean; marketing: boolean }) {
  const valeur: ConsentementCookies = { essentiels: true, ...choix, date: new Date().toISOString() };
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(valeur));
  window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
}
