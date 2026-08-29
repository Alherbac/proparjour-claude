/**
 * Normalisation et tolérance aux fautes partagées entre lib/recherche.ts
 * (catalogue) et lib/besoin.ts (parcours besoin structuré) — une seule
 * implémentation pour ne pas faire diverger la façon dont "vendeuse",
 * "sécurité" avec une faute, etc. sont reconnus selon la porte d'entrée
 * empruntée par l'utilisateur.
 */

export function normaliserTexte(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Distance de Levenshtein — mots courts uniquement (recherche libre), coût négligeable. */
function distanceLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let precedente = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const courante = [i];
    for (let j = 1; j <= n; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      courante.push(Math.min(precedente[j] + 1, courante[j - 1] + 1, precedente[j - 1] + cout));
    }
    precedente = courante;
  }
  return precedente[n];
}

/**
 * Deux mots sont "proches" s'ils sont identiques, ou si une faute de
 * frappe simple (1 caractère substitué/ajouté/retiré) les sépare —
 * réservé aux mots d'au moins 4 caractères pour éviter les faux
 * positifs entre mots courts sans rapport ("vin"/"fin").
 */
export function motsProches(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  if (Math.abs(a.length - b.length) > 1) return false;
  return distanceLevenshtein(a, b) <= 1;
}
