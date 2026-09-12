/**
 * Échappement CSV.
 *
 * 1. RFC 4180 : guillemets si la valeur contient une virgule, un
 *    guillemet ou un retour à la ligne.
 * 2. Anti-injection de formule (audit prod I6) : un champ qui commence
 *    par `= + - @`, une tabulation ou un retour chariot est interprété
 *    comme une formule par Excel / Google Sheets / LibreOffice à
 *    l'ouverture du fichier. On le neutralise en préfixant une
 *    apostrophe — la cellule affiche alors le texte littéral.
 */
function echapperChampCsv(valeur: unknown): string {
  let texte = valeur === null || valeur === undefined ? "" : String(valeur);

  if (texte !== "" && /^[=+\-@\t\r]/.test(texte)) {
    texte = `'${texte}`;
  }

  if (/[",\n\r]/.test(texte)) {
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
