export const FAVORIS_STORAGE_KEY = "proparjour:favoris";
export const FAVORIS_EVENT = "proparjour:favoris-update";

export type Favoris = { ids: string[] };

const FAVORIS_VIDE: Favoris = { ids: [] };

export function lireFavoris(): Favoris {
  if (typeof window === "undefined") return FAVORIS_VIDE;
  try {
    const raw = window.localStorage.getItem(FAVORIS_STORAGE_KEY);
    if (!raw) return FAVORIS_VIDE;
    const parsed = JSON.parse(raw) as Favoris;
    return { ...FAVORIS_VIDE, ...parsed };
  } catch {
    return FAVORIS_VIDE;
  }
}

function ecrireFavoris(favoris: Favoris) {
  window.localStorage.setItem(FAVORIS_STORAGE_KEY, JSON.stringify(favoris));
  window.dispatchEvent(new Event(FAVORIS_EVENT));
}

export function estFavori(id: string): boolean {
  return lireFavoris().ids.includes(id);
}

export function basculerFavori(id: string) {
  const favoris = lireFavoris();
  const deja = favoris.ids.includes(id);
  ecrireFavoris({ ids: deja ? favoris.ids.filter((i) => i !== id) : [...favoris.ids, id] });
}
