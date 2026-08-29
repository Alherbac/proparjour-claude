import "server-only";

/**
 * Catégorie B, point 10 : les messages Postgres/Supabase bruts
 * (`error.message`) sont en anglais, décrivent l'implémentation
 * (noms de colonnes/contraintes) et ne doivent jamais atteindre
 * l'utilisateur final. On ne traduit que par le `code` (stable,
 * documenté par Postgres — https://www.postgresql.org/docs/current/errcodes-appendix.html),
 * jamais en essayant de parser le texte du message.
 */
const MESSAGES_PAR_CODE: Record<string, string> = {
  "23505": "Cette information existe déjà.",
  "23503": "Cette action fait référence à une donnée introuvable ou déjà supprimée.",
  "23514": "Une valeur saisie ne respecte pas le format attendu.",
  "23502": "Un champ obligatoire est manquant.",
  "42501": "Vous n'avez pas les droits nécessaires pour cette action.",
  PGRST301: "Vous n'avez pas les droits nécessaires pour cette action.",
};

/**
 * Traduit une erreur Postgres/Supabase brute en message français sûr
 * à afficher tel quel. `repli` est le message par défaut quand le
 * code n'est pas reconnu — à adapter au contexte de l'appelant.
 */
export function traduireErreurDb(
  error: { code?: string | null } | null | undefined,
  repli = "Une erreur est survenue. Réessayez dans un instant.",
): string {
  const code = error?.code;
  if (code && MESSAGES_PAR_CODE[code]) return MESSAGES_PAR_CODE[code];
  return repli;
}
