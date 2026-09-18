import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { cheminInterneOuNull } from "@/lib/redirection";

/**
 * Atterrissage du lien de confirmation d'e-mail (bug staging — voir
 * components/onboarding/recruteur/form.tsx : signUp y passe
 * `emailRedirectTo` vers CETTE route).
 *
 * Corrigé (2e passe) : l'échange PKCE (`exchangeCodeForSession`) doit
 * s'exécuter côté SERVEUR, via le client SSR (`@/lib/supabase/server`,
 * `createServerClient`), qui lit le cookie `code_verifier` posé au
 * moment de signUp directement depuis les en-têtes de LA REQUÊTE
 * (`cookies()` de Next.js) — jamais via le client navigateur dans un
 * composant "use client", qui dépendait de `document.cookie` relu à
 * un moment arbitraire après hydratation : c'est ce qui provoquait
 * "PKCE code verifier not found in storage". Même principe déjà en
 * place dans /auth/callback/route.ts pour Google OAuth.
 *
 * Ne complète PAS le profil recruteur ici (une Route Handler n'a pas
 * accès au localStorage du navigateur, où le brouillon est sauvegardé
 * avant signUp) — elle établit uniquement la session, puis renvoie
 * vers /inscription/recruteur si le profil est incomplet : cette page
 * (déjà équipée d'un effet de reprise automatique via le brouillon)
 * termine l'inscription sans redemander le formulaire.
 *
 * Corrigé (3e passe) : le renvoi "profil incomplet" était toujours
 * vers /inscription/recruteur, même pour un prestataire — un
 * prestataire qui confirmait son e-mail atterrissait donc sur le
 * formulaire de complétion RECRUTEUR ("Complétez votre profil" avec
 * Particulier/Entreprise) au lieu de reprendre son propre parcours.
 * `role_intent` est posé dans `user_metadata` au moment du signUp
 * (voir wizard.tsx et recruteur/form.tsx) — absent pour tout compte
 * déjà existant ou créé sans cette version, on retombe alors sur le
 * comportement recruteur historique, inchangé.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = cheminInterneOuNull(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Lien de confirmation incomplet.") };

  if (error) {
    return NextResponse.redirect(
      `${origin}/connexion?erreur=${type === "recovery" ? "reinitialisation" : "confirmation"}`,
    );
  }

  // Réinitialisation de mot de passe : la session posée par l'échange
  // ci-dessus n'a rien à voir avec une confirmation d'inscription —
  // jamais la faire passer par la logique de complétion de profil
  // plus bas (elle renverrait un compte déjà complet vers son espace
  // sans lui laisser choisir son nouveau mot de passe).
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reinitialiser-mot-de-passe`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/connexion?erreur=confirmation`);
  }

  const { data: profil } = await supabase.from("users").select("type").eq("id", user.id).maybeSingle();
  if (!profil?.type) {
    const roleIntent = user.user_metadata?.role_intent;
    const cheminInscription = roleIntent === "prestataire" ? "/inscription/prestataire" : "/inscription/recruteur";
    return NextResponse.redirect(`${origin}${cheminInscription}${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  const espaceParDefaut = profil.type === "prestataire" ? "/prestataire" : "/client";
  return NextResponse.redirect(`${origin}${next ?? espaceParDefaut}`);
}
