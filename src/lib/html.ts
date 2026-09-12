/**
 * Échappe les caractères spéciaux HTML avant interpolation dans une
 * chaîne de balisage (audit prod I5). À utiliser pour toute donnée
 * fournie par un utilisateur insérée dans du HTML côté serveur —
 * notamment les gabarits d'e-mails (lib/email.ts), où un titre d'offre
 * ou un corps de message pourrait sinon injecter `<script>` /
 * `<img onerror=…>`.
 *
 * Couvre aussi les valeurs d'attribut (guillemets simples et doubles).
 */
export function escapeHtml(valeur: unknown): string {
  const texte = valeur === null || valeur === undefined ? "" : String(valeur);
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
