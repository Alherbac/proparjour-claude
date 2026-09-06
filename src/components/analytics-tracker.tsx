"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { COOKIE_CONSENT_EVENT, lireConsentement } from "@/lib/cookie-consent";

const SESSION_KEY = "ppj_session_id";

function idSession(): string {
  try {
    const existant = window.sessionStorage.getItem(SESSION_KEY);
    if (existant) return existant;
    const nouveau = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, nouveau);
    return nouveau;
  } catch {
    // sessionStorage indisponible (navigation privée stricte, etc.) —
    // un id par vue plutôt que planter : dégrade juste la mesure de
    // "visiteur unique", jamais le fonctionnement du site.
    return crypto.randomUUID();
  }
}

function envoyerVue(chemin: string) {
  const payload = JSON.stringify({
    chemin,
    sessionId: idSession(),
    appareil: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
  });
  try {
    const blob = new Blob([payload], { type: "application/json" });
    if (!navigator.sendBeacon("/api/analytics/vue", blob)) {
      fetch("/api/analytics/vue", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
    }
  } catch {
    // Best-effort — une vue non enregistrée ne doit jamais remonter d'erreur visible.
  }
}

/**
 * Mesure d'audience de première partie, posée sur tout le site
 * (src/app/layout.tsx) — n'envoie rien tant que le visiteur n'a pas
 * consenti à la catégorie "audience" (cookie-consent.ts, cahier des
 * charges §6.2). Alimente `visites` (migration 0046), lue uniquement
 * par le back-office admin.
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    function consentementActif() {
      return lireConsentement()?.audience === true;
    }

    if (consentementActif()) envoyerVue(pathname);

    // Le bandeau peut être accepté après le premier rendu de la page —
    // on n'attend pas la navigation suivante pour comptabiliser la
    // page déjà affichée.
    function onConsentement() {
      if (consentementActif()) envoyerVue(pathname);
    }
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentement);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentement);
  }, [pathname]);

  return null;
}
