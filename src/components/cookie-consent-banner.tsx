"use client";

/* eslint-disable react-hooks/set-state-in-effect -- lecture localStorage après montage, jamais dans un initialiseur (même règle que documentée sur BesoinCapture, Bloc 10 : lire pendant le rendu produirait un contenu différent entre le serveur et le client). */

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lireConsentement, ecrireConsentement } from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [personnaliserOuvert, setPersonnaliserOuvert] = useState(false);
  const [audience, setAudience] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!lireConsentement()) setVisible(true);
  }, []);

  function accepterTout() {
    ecrireConsentement({ audience: true, marketing: true });
    setVisible(false);
  }

  function refuserTout() {
    ecrireConsentement({ audience: false, marketing: false });
    setVisible(false);
  }

  function enregistrerChoix() {
    ecrireConsentement({ audience, marketing });
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Préférences de cookies"
      // Audit final — se pose au-dessus de la navigation mobile du
      // tableau de bord quand elle est présente (voir bottom-nav.tsx,
      // --ppj-bottom-nav-h) plutôt que de se superposer à elle : sans
      // ça, l'une des deux barres finissait toujours masquée ou
      // partiellement inutilisable tant que ce bandeau restait affiché.
      // Vaut 0px sur toute page sans cette navigation (comportement
      // inchangé partout ailleurs).
      style={{ bottom: "var(--ppj-bottom-nav-h, 0px)" }}
      className="fixed inset-x-0 z-[100] border-t border-border bg-background p-4 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.25)] sm:p-5"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Vos préférences de cookies</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ProParJour utilise des cookies essentiels au fonctionnement du site (session, panier). Avec votre
              accord, nous pourrions aussi mesurer l&apos;audience du site.{" "}
              <a href="/confidentialite" className="underline underline-offset-2 hover:text-foreground">
                En savoir plus
              </a>
              .
            </p>
          </div>
        </div>

        {personnaliserOuvert && (
          <div className="grid gap-2.5 rounded-xl border border-border bg-secondary/30 p-3.5">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">Essentiels</span>
              <input type="checkbox" checked disabled className="size-4 accent-primary opacity-60" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-foreground">Mesure d&apos;audience</span>
              <input
                type="checkbox"
                checked={audience}
                onChange={(e) => setAudience(e.target.checked)}
                className="size-4 accent-primary"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-foreground">Marketing</span>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="size-4 accent-primary"
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {!personnaliserOuvert ? (
            <Button variant="ghost" size="sm" onClick={() => setPersonnaliserOuvert(true)}>
              Personnaliser
            </Button>
          ) : (
            <Button size="sm" onClick={enregistrerChoix}>
              Enregistrer mes choix
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={refuserTout}>
            Tout refuser
          </Button>
          <Button size="sm" onClick={accepterTout}>
            Tout accepter
          </Button>
        </div>
      </div>
    </div>
  );
}
