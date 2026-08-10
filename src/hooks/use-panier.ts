"use client";

import { useSyncExternalStore } from "react";
import { PANIER_EVENT, PANIER_STORAGE_KEY, type Panier } from "@/lib/panier";

const PANIER_VIDE: Panier = { lignes: [] };

// useSyncExternalStore exige une snapshot référentiellement stable
// tant que la donnée sous-jacente n'a pas changé (sinon boucle de
// re-render infinie) — on ne re-parse le JSON que si la chaîne brute
// en localStorage a effectivement changé depuis le dernier appel.
let derniereChaineBrute: string | null | undefined;
let derniereSnapshot: Panier = PANIER_VIDE;

function getSnapshot(): Panier {
  const brute = window.localStorage.getItem(PANIER_STORAGE_KEY);
  if (brute !== derniereChaineBrute) {
    derniereChaineBrute = brute;
    try {
      derniereSnapshot = brute ? { ...PANIER_VIDE, ...JSON.parse(brute) } : PANIER_VIDE;
    } catch {
      derniereSnapshot = PANIER_VIDE;
    }
  }
  return derniereSnapshot;
}

function getServerSnapshot(): Panier {
  return PANIER_VIDE;
}

function subscribe(callback: () => void) {
  window.addEventListener(PANIER_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PANIER_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function usePanier(): Panier {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
