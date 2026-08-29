"use client";

import { useSyncExternalStore } from "react";
import { FAVORIS_EVENT, FAVORIS_STORAGE_KEY, type Favoris } from "@/lib/favoris";

const FAVORIS_VIDE: Favoris = { ids: [] };

let derniereChaineBrute: string | null | undefined;
let derniereSnapshot: Favoris = FAVORIS_VIDE;

function getSnapshot(): Favoris {
  const brute = window.localStorage.getItem(FAVORIS_STORAGE_KEY);
  if (brute !== derniereChaineBrute) {
    derniereChaineBrute = brute;
    try {
      derniereSnapshot = brute ? { ...FAVORIS_VIDE, ...JSON.parse(brute) } : FAVORIS_VIDE;
    } catch {
      derniereSnapshot = FAVORIS_VIDE;
    }
  }
  return derniereSnapshot;
}

function getServerSnapshot(): Favoris {
  return FAVORIS_VIDE;
}

function subscribe(callback: () => void) {
  window.addEventListener(FAVORIS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(FAVORIS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function useFavoris(): Favoris {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
