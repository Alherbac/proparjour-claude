/** Échappement CSV standard (RFC 4180) — guillemets si la valeur contient une virgule, un guillemet ou un retour à la ligne. */
function echapperChampCsv(valeur: unknown): string {
  const texte = valeur === null || valeur === undefined ? "" : String(valeur);
  if (/[",\n]/.test(texte)) {
    return `"${texte.replace(/"/g, '""')}"`;
  }
  return texte;
}

/** Construit un CSV complet (en-têtes + lignes) à partir d'un tableau d'objets homogènes. */
export function construireCsv(colonnes: string[], lignes: Record<string, unknown>[]): string {
  const entetes = colonnes.map(echapperChampCsv).join(",");
  const corps = lignes.map((ligne) => colonnes.map((c) => echapperChampCsv(ligne[c])).join(","));
  return [entetes, ...corps].join("\r\n");
}
