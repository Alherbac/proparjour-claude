/**
 * Filtre anti-open-redirect (audit prod I2). Un paramètre `next`
 * fourni dans l'URL ne doit jamais pouvoir renvoyer l'utilisateur vers
 * un domaine externe après connexion : on n'accepte qu'un chemin
 * interne absolu ("/client", "/prestataire", …).
 *
 * Rejeté : "//evil.com", "https://evil.com", "/\\evil.com",
 * les chemins relatifs, et tout ce qui contient un caractère de
 * contrôle (tentatives de contournement via CR/LF/tab).
 */
export function cheminInterneOuNull(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  // "//host" et "/\host" sont interprétés comme des URL protocol-relative
  // par les navigateurs → externes.
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(next)) return null;
  return next;
}
