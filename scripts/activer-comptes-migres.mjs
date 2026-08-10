#!/usr/bin/env node
/**
 * Envoie un e-mail de réinitialisation de mot de passe à tous les
 * comptes importés par scripts/migrate-lovable.mjs (repérés via
 * user_metadata.migre_depuis === "lovable").
 *
 * À NE LANCER QUE LE JOUR DE LA MISE EN PRODUCTION — envoie de vrais
 * e-mails à de vrais utilisateurs, action volontaire et irréversible.
 *
 * Usage :
 *   node scripts/activer-comptes-migres.mjs                 # dry-run, liste les comptes concernés
 *   node scripts/activer-comptes-migres.mjs --write          # envoie réellement les e-mails
 */

import { createClient } from "@supabase/supabase-js";

const WRITE = process.argv.includes("--write");

function envOrDie(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Variable d'environnement manquante : ${name}`);
    process.exit(1);
  }
  return value;
}

const supabase = createClient(
  envOrDie("NEXT_PUBLIC_SUPABASE_URL"),
  envOrDie("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function listerComptesMigres() {
  const comptes = [];
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    comptes.push(...data.users.filter((u) => u.user_metadata?.migre_depuis === "lovable"));
    if (data.users.length < 200) break;
    page += 1;
  }
  return comptes;
}

async function main() {
  const comptes = await listerComptesMigres();
  console.log(`${comptes.length} comptes migrés trouvés.`);

  if (!WRITE) {
    console.table(comptes.map((c) => ({ email: c.email, cree_le: c.created_at })));
    console.log("\nDry-run — relance avec --write pour envoyer les e-mails de réinitialisation.");
    return;
  }

  const siteUrl = envOrDie("NEXT_PUBLIC_SITE_URL"); // ex. https://proparjour.fr — à définir dans .env.local avant la mise en production

  let envoyes = 0;
  for (const compte of comptes) {
    // resetPasswordForEmail (et non generateLink, qui renvoie un lien
    // sans jamais l'envoyer) déclenche le vrai e-mail via le modèle
    // "Reset Password" configuré dans Supabase Auth.
    const { error } = await supabase.auth.resetPasswordForEmail(compte.email, {
      redirectTo: `${siteUrl}/connexion`,
    });
    if (error) {
      console.error(`Échec pour ${compte.email} : ${error.message}`);
      continue;
    }
    envoyes += 1;
  }
  console.log(`${envoyes}/${comptes.length} e-mails de réinitialisation envoyés.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
